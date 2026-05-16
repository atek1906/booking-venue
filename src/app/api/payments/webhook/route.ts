import { NextRequest, NextResponse } from "next/server";
import { bookings, payments } from "@/lib/mock-data";
import { mapGatewayStatus, verifyMidtransSignature } from "@/lib/payment";

const webhookAudit: unknown[] = [];

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const isVerified = verifyMidtransSignature(payload);
  webhookAudit.push({ provider: "midtrans", payload, isVerified, receivedAt: new Date().toISOString() });

  if (!isVerified) {
    return NextResponse.json({ message: "Signature webhook tidak valid" }, { status: 401 });
  }

  const payment = payments.find((item) => item.transactionId === payload.order_id || item.bookingId === payload.order_id);
  if (!payment) return NextResponse.json({ message: "Payment tidak ditemukan" }, { status: 404 });

  const status = mapGatewayStatus(payload.transaction_status, payload.fraud_status);
  payment.status = status;
  payment.rawResponse = payload;

  const booking = bookings.find((item) => item.id === payment.bookingId);
  if (booking && status === "paid") booking.status = "confirmed";
  if (booking && ["failed", "expired"].includes(status)) booking.status = "expired";
  if (booking && status === "refunded") booking.status = "cancelled";

  return NextResponse.json({ received: true, status });
}
