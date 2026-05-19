import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, UserRole } from "@prisma/client";
import { getAuthUser, requireRole } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const booking = await getBookingForUser(id, user);
    if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404 });
    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Login diperlukan" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, [UserRole.VENUE_ADMIN, UserRole.SUPER_ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status).toUpperCase() as BookingStatus;
    await prisma.booking.update({ where: { id }, data: { status } });
    const booking = await getBookingForUser(id, user);
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal mengubah booking" }, { status: 400 });
  }
}
