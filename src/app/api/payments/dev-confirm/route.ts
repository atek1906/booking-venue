import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";
import { isDevPaymentConfirmEnabled } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

const devConfirmSchema = z.object({
  bookingId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.payments.dev_confirm");
  try {
    if (!isDevPaymentConfirmEnabled()) {
      return NextResponse.json({ message: "Konfirmasi pembayaran lokal tidak aktif" }, { status: 404, headers: { "x-request-id": context.requestId } });
    }

    const user = await getAuthUser(request);
    const { bookingId } = devConfirmSchema.parse(await request.json());
    const payment = await prisma.payment.findFirst({
      where: { bookingId, booking: { userId: user.id } }
    });
    if (!payment) return NextResponse.json({ message: "Booking/payment tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() }
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED }
      })
    ]);

    const booking = await getBookingForUser(bookingId, user);
    logger.info("payment_dev_confirm.applied", { ...context, bookingId, paymentId: payment.id });
    return NextResponse.json({ booking }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("payment_dev_confirm.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({
      message: errorMessage(error, "Gagal konfirmasi pembayaran lokal")
    }, { status: 400, headers: { "x-request-id": context.requestId } });
  }
}
