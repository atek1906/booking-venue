import { NextRequest, NextResponse } from "next/server";
import { getCourtWithVenue } from "@/lib/db-data";
import { getRequestContext } from "@/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request, "api.courts.detail");
  const { id } = await params;
  const data = await getCourtWithVenue(id);
  if (!data) return NextResponse.json({ message: "Lapangan tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
  return NextResponse.json({
    court: {
      id: data.court.id,
      venueId: data.court.venueId,
      name: data.court.name,
      sportType: data.court.sportType,
      surface: data.court.surface,
      pricePerHour: data.court.pricePerHour
    },
    venue: data.venue
  }, { headers: { "x-request-id": context.requestId } });
}
