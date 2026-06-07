import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";
import { isDevPaymentConfirmEnabled } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

const simulateSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(["paid", "failed", "expired"])
});

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.payments.simulate");
  try {
    if (!isDevPaymentConfirmEnabled()) {
      return NextResponse.json({ message: "Simulasi pembayaran tidak aktif" }, { status: 404, headers: { "x-request-id": context.requestId } });
    }

    const user = await getAuthUser(request);
    const { bookingId, status } = simulateSchema.parse(await request.json());
    const payment = await prisma.payment.findFirst({ where: { bookingId, booking: { userId: user.id } } });
    if (!payment) return NextResponse.json({ message: "Booking/payment tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });

    const paymentStatus = status.toUpperCase() as PaymentStatus;
    const bookingStatus = status === "paid" ? BookingStatus.CONFIRMED : BookingStatus.EXPIRED;

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, paidAt: status === "paid" ? new Date() : null } }),
      prisma.booking.update({ where: { id: bookingId }, data: { status: bookingStatus } })
    ]);

    const booking = await getBookingForUser(bookingId, user);
    logger.info("payment_simulate.applied", { ...context, bookingId, paymentId: payment.id, status });
    return NextResponse.json({ booking }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("payment_simulate.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Gagal simulasi pembayaran") }, { status: 400, headers: { "x-request-id": context.requestId } });
  }
}
