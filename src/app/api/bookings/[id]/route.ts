import { NextRequest, NextResponse } from "next/server";
import { bookings } from "@/lib/mock-data";
import { getBookingView, updateBookingStatus } from "@/lib/booking";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = bookings.find((item) => item.id === id || item.bookingCode === id);
  if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404 });
  return NextResponse.json(getBookingView(booking));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const booking = updateBookingStatus(id, body.status);
    return NextResponse.json({ booking: getBookingView(booking) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal mengubah booking" }, { status: 400 });
  }
}
