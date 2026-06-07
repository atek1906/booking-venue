import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-server";
import { createStoredPayment, getBookingForUser } from "@/lib/db-data";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";
import { createMidtransSnapTransaction, PaymentGatewayError } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  method: z.literal("snap").optional()
});

function getAppUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.payments.create");
  try {
    const user = await getAuthUser(request);
    const payload = createPaymentSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      logger.warn("payment_create.invalid_payload", context);
      return NextResponse.json({ message: "Request pembayaran tidak valid" }, { status: 400, headers: { "x-request-id": context.requestId } });
    }

    const { bookingId } = payload.data;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id },
      include: { user: true, payment: true }
    });
    if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
    if (booking.status !== "PENDING_PAYMENT") {
      logger.warn("payment_create.booking_not_payable", { ...context, bookingId, bookingStatus: booking.status });
      return NextResponse.json({ message: "Booking tidak bisa dibayar" }, { status: 400, headers: { "x-request-id": context.requestId } });
    }

    if (booking.payment?.status === PaymentStatus.PENDING && booking.payment.invoiceUrl) {
      const view = await getBookingForUser(booking.id, user);
      logger.info("payment_create.reused_pending_payment", {
        ...context,
        bookingId: booking.id,
        paymentId: booking.payment.id,
        provider: booking.payment.provider
      });
      return NextResponse.json({ payment: booking.payment, booking: view }, { headers: { "x-request-id": context.requestId } });
    }

    const gateway = process.env.PAYMENT_GATEWAY === "midtrans" ? "midtrans" : "mock";
    let payment;

    if (gateway === "midtrans") {
      const response = await createMidtransSnapTransaction({
        booking,
        user: booking.user,
        finishUrl: `${getAppUrl(request)}/payment/status?bookingId=${booking.id}`
      });
      payment = await createStoredPayment({
        booking,
        provider: PaymentProvider.MIDTRANS,
        method: "snap",
        providerTransactionId: booking.id,
        invoiceUrl: response.redirect_url,
        rawResponse: response as Prisma.InputJsonValue
      });
    } else {
      payment = await createStoredPayment({
        booking,
        provider: PaymentProvider.MOCK,
        method: "mock",
        providerTransactionId: `PAY-${Date.now()}`,
        invoiceUrl: `/payment/status?bookingId=${booking.id}`
      });
    }

    const view = await getBookingForUser(booking.id, user);
    logger.info("payment_create.created", {
      ...context,
      bookingId: booking.id,
      paymentId: payment.id,
      provider: payment.provider,
      method: gateway === "midtrans" ? "snap" : "mock",
      grossAmount: payment.grossAmount
    });
    return NextResponse.json({ payment, booking: view }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    const status = error instanceof PaymentGatewayError ? 502 : 500;
    logger.error("payment_create.failed", {
      ...context,
      status,
      error: errorDetails(error)
    });
    return NextResponse.json({ message: errorMessage(error, "Gagal membuat transaksi pembayaran") }, { status, headers: { "x-request-id": context.requestId } });
  }
}
