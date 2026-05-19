import { NextRequest, NextResponse } from "next/server";
import { listVenues } from "@/lib/db-data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sport = params.get("sport") || undefined;
  const location = params.get("location") || undefined;
  const maxPrice = Number(params.get("maxPrice") || 0);
  const venues = await listVenues({ sport, location, maxPrice });
  return NextResponse.json({ venues });
}
