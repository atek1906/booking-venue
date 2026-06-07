import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: process.env.LOG_SERVICE_NAME || "courtbook",
    environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
}
