import { NextRequest, NextResponse } from "next/server";
import { bookings } from "@/lib/mock-data";
import { createBooking, expireStaleBookings, getBookingView } from "@/lib/booking";

export async function GET() {
  expireStaleBookings();
  return NextResponse.json({ bookings: bookings.map(getBookingView).reverse() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const booking = createBooking({
      courtId: String(body.courtId),
      date: String(body.date),
      startTime: String(body.startTime),
      durationHours: Number(body.durationHours),
      userName: body.userName,
      userEmail: body.userEmail
    });
    return NextResponse.json({ booking: getBookingView(booking) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal membuat booking" }, { status: 400 });
  }
}
