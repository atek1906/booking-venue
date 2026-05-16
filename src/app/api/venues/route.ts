import { NextRequest, NextResponse } from "next/server";
import { venues } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sport = params.get("sport");
  const location = params.get("location")?.toLowerCase();
  const maxPrice = Number(params.get("maxPrice") || 0);
  const availableOnly = params.get("available") === "true";

  const result = venues.filter((venue) => {
    const sportMatch = !sport || venue.courts.some((court) => court.sportType === sport);
    const locationMatch = !location || `${venue.city} ${venue.location}`.toLowerCase().includes(location);
    const priceMatch = !maxPrice || venue.courts.some((court) => court.pricePerHour <= maxPrice);
    return sportMatch && locationMatch && priceMatch && (!availableOnly || venue.courts.length > 0);
  });

  return NextResponse.json({ venues: result });
}
