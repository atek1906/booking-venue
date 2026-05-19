import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { bookingId, status } = await request.json() as { bookingId: string; status: "paid" | "failed" | "expired" };
    const payment = await prisma.payment.findFirst({ where: { bookingId, booking: { userId: user.id } } });
    if (!payment) return NextResponse.json({ message: "Booking/payment tidak ditemukan" }, { status: 404 });

    const paymentStatus = status.toUpperCase() as PaymentStatus;
    const bookingStatus = status === "paid" ? BookingStatus.CONFIRMED : BookingStatus.EXPIRED;

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, paidAt: status === "paid" ? new Date() : null } }),
      prisma.booking.update({ where: { id: bookingId }, data: { status: bookingStatus } })
    ]);

    const booking = await getBookingForUser(bookingId, user);
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal simulasi pembayaran" }, { status: 400 });
  }
}
