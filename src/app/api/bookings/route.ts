import { NextRequest, NextResponse } from "next/server";
import { createBooking, getBookingForUser, listBookingsForUser } from "@/lib/db-data";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const bookings = await listBookingsForUser(user);
    return NextResponse.json({ bookings });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Login diperlukan" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const booking = await createBooking({
      courtId: String(body.courtId),
      date: String(body.date),
      startTime: String(body.startTime),
      durationHours: Number(body.durationHours),
      userId: user.id
    });
    const view = await getBookingForUser(booking.id, user);
    return NextResponse.json({ booking: view }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal membuat booking" }, { status: 400 });
  }
}
