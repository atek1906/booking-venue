import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { getAuthUser, requireRole } from "@/lib/auth-server";
import { getBookingForUser } from "@/lib/db-data";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus)
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request, "api.bookings.detail");
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const booking = await getBookingForUser(id, user);
    if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
    return NextResponse.json(booking, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("booking_detail.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Login diperlukan") }, { status: 401, headers: { "x-request-id": context.requestId } });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request, "api.bookings.update");
  try {
    const user = await getAuthUser(request);
    requireRole(user, [UserRole.VENUE_ADMIN, UserRole.SUPER_ADMIN]);
    const { id } = await params;
    const body = updateBookingSchema.parse(await request.json());
    await prisma.booking.update({ where: { id }, data: { status: body.status } });
    const booking = await getBookingForUser(id, user);
    logger.info("booking_update.updated", { ...context, bookingId: id, status: body.status, actorRole: user.role });
    return NextResponse.json({ booking }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("booking_update.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Gagal mengubah booking") }, { status: 400, headers: { "x-request-id": context.requestId } });
  }
}
