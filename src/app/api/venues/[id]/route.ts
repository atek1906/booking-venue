import { NextRequest, NextResponse } from "next/server";
import { getVenue } from "@/lib/db-data";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) return NextResponse.json({ message: "Venue tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ venue });
}
