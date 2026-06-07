import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking, getBookingForUser, listBookingsForUser } from "@/lib/db-data";
import { getAuthUser } from "@/lib/auth-server";
import { errorDetails, errorMessage, getRequestContext, logger } from "@/lib/logger";

const createBookingSchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.coerce.number().int().min(1).max(3)
});

export async function GET(request: NextRequest) {
  const context = getRequestContext(request, "api.bookings.list");
  try {
    const user = await getAuthUser(request);
    const bookings = await listBookingsForUser(user);
    return NextResponse.json({ bookings }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("bookings_list.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Login diperlukan") }, { status: 401, headers: { "x-request-id": context.requestId } });
  }
}

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.bookings.create");
  try {
    const user = await getAuthUser(request);
    const body = createBookingSchema.parse(await request.json());
    const booking = await createBooking({
      courtId: body.courtId,
      date: body.date,
      startTime: body.startTime,
      durationHours: body.durationHours,
      userId: user.id
    });
    const view = await getBookingForUser(booking.id, user);
    logger.info("booking_create.created", {
      ...context,
      bookingId: booking.id,
      courtId: booking.courtId,
      startsAt: booking.startsAt.toISOString(),
      durationHours: booking.durationHours,
      total: booking.total
    });
    return NextResponse.json({ booking: view }, { status: 201, headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("booking_create.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({ message: errorMessage(error, "Gagal membuat booking") }, { status: 400, headers: { "x-request-id": context.requestId } });
  }
}
