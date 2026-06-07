import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function metricLine(name: string, value: number, labels: Record<string, string> = {}) {
  const renderedLabels = Object.entries(labels)
    .map(([key, labelValue]) => `${key}="${labelValue.replaceAll("\"", "\\\"")}"`)
    .join(",");
  return `${name}${renderedLabels ? `{${renderedLabels}}` : ""} ${value}`;
}

export function GET() {
  const service = process.env.LOG_SERVICE_NAME || "courtbook";
  const environment = process.env.APP_ENV || process.env.NODE_ENV || "development";
  const lines = [
    "# HELP courtbook_app_info Static application metadata.",
    "# TYPE courtbook_app_info gauge",
    metricLine("courtbook_app_info", 1, { service, environment }),
    "# HELP courtbook_uptime_seconds Runtime uptime in seconds.",
    "# TYPE courtbook_uptime_seconds gauge",
    metricLine("courtbook_uptime_seconds", Math.round(process.uptime())),
    "# HELP courtbook_midtrans_configured Whether Midtrans credentials are present when enabled.",
    "# TYPE courtbook_midtrans_configured gauge",
    metricLine("courtbook_midtrans_configured", process.env.PAYMENT_GATEWAY === "midtrans" && !process.env.MIDTRANS_SERVER_KEY ? 0 : 1)
  ];

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" }
  });
}
