import { NextRequest, NextResponse } from "next/server";
import { bookings, payments } from "@/lib/mock-data";
import { getBookingView } from "@/lib/booking";
import type { PaymentStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { bookingId, status } = await request.json() as { bookingId: string; status: PaymentStatus };
  const booking = bookings.find((item) => item.id === bookingId);
  const payment = payments.find((item) => item.bookingId === bookingId);
  if (!booking || !payment) return NextResponse.json({ message: "Booking/payment tidak ditemukan" }, { status: 404 });

  payment.status = status;
  if (status === "paid") booking.status = "confirmed";
  if (status === "failed") booking.status = "expired";
  if (status === "expired") booking.status = "expired";
  if (status === "refunded") booking.status = "cancelled";

  return NextResponse.json({ payment, booking: getBookingView(booking) });
}
