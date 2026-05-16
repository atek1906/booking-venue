import { NextRequest, NextResponse } from "next/server";
import { venues } from "@/lib/mock-data";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = venues.find((item) => item.id === id || item.slug === id);
  if (!venue) return NextResponse.json({ message: "Venue tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ venue });
}
