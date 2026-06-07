import { NextRequest, NextResponse } from "next/server";
import { getCourtAvailability, todayInJakarta } from "@/lib/db-data";
import { errorMessage, getRequestContext, logger, errorDetails } from "@/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request, "api.courts.availability");
  try {
    const { id } = await params;
    const search = request.nextUrl.searchParams;
    const availability = await getCourtAvailability({
      courtId: id,
      start: search.get("start") || todayInJakarta(),
      days: Number(search.get("days") || 7),
      durationHours: Number(search.get("durationHours") || 1)
    });

    if (!availability) {
      return NextResponse.json({ message: "Lapangan tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
    }

    return NextResponse.json(availability, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.warn("court_availability.failed", { ...context, error: errorDetails(error) });
    return NextResponse.json({
      message: errorMessage(error, "Gagal memuat availability")
    }, { status: 400, headers: { "x-request-id": context.requestId } });
  }
}
