import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function paymentConfigured() {
  if (process.env.PAYMENT_GATEWAY !== "midtrans") return true;
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

export async function GET() {
  const checks = {
    database: false,
    paymentGateway: paymentConfigured(),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL)
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json({
    status: ready ? "ready" : "not_ready",
    checks,
    timestamp: new Date().toISOString()
  }, { status: ready ? 200 : 503 });
}
