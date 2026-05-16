import { NextRequest, NextResponse } from "next/server";
import { bookings } from "@/lib/mock-data";
import { createPaymentForBooking, getBookingView } from "@/lib/booking";

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404 });
    if (booking.status !== "pending_payment") return NextResponse.json({ message: "Booking tidak bisa dibayar" }, { status: 400 });

    const payment = createPaymentForBooking(booking);
    return NextResponse.json({ payment, booking: getBookingView(booking) });
  } catch {
    return NextResponse.json({ message: "Gagal membuat transaksi pembayaran" }, { status: 500 });
  }
}
