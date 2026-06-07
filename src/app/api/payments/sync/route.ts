import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider, type Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";
import { getMidtransTransactionStatus, PaymentGatewayError } from "@/lib/payment";
import { applyMidtransStatusPayload } from "@/lib/payment-sync";
import { prisma } from "@/lib/prisma";

const syncPaymentSchema = z.object({
  bookingId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.payments.sync");

  try {
    const user = await getAuthUser(request);
    const payload = syncPaymentSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json({ message: "Request sinkronisasi tidak valid" }, { status: 400, headers: { "x-request-id": context.requestId } });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: payload.data.bookingId, userId: user.id },
      include: { payment: true }
    });
    if (!booking?.payment) {
      return NextResponse.json({ message: "Booking/payment tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
    }
    if (booking.payment.provider !== PaymentProvider.MIDTRANS) {
      return NextResponse.json({ message: "Payment bukan transaksi Midtrans" }, { status: 400, headers: { "x-request-id": context.requestId } });
    }

    const orderId = booking.payment.bookingId;
    const midtransStatus = await getMidtransTransactionStatus(orderId);
    const result = await applyMidtransStatusPayload({
      payment: booking.payment,
      payload: midtransStatus as Prisma.InputJsonObject,
      eventTypePrefix: "status_sync"
    });
    const view = await getBookingForUser(booking.id, user);

    logger.info("payment_sync.completed", {
      ...context,
      bookingId: booking.id,
      paymentId: booking.payment.id,
      orderId,
      transactionStatus: midtransStatus.transaction_status,
      mappedStatus: result.status,
      applied: result.applied
    });

    return NextResponse.json({ booking: view, sync: result }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    const status = error instanceof PaymentGatewayError ? 502 : 500;
    logger.error("payment_sync.failed", { ...context, status, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Gagal sinkronisasi status pembayaran") }, { status, headers: { "x-request-id": context.requestId } });
  }
}
