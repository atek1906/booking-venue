import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { mapGatewayStatus, verifyMidtransSignature } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const isVerified = verifyMidtransSignature(payload);

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerTransactionId: payload.transaction_id },
        { providerTransactionId: payload.order_id },
        { bookingId: payload.order_id }
      ]
    }
  });

  await prisma.paymentWebhook.create({
    data: {
      paymentId: payment?.id,
      provider: PaymentProvider.MIDTRANS,
      eventType: payload.transaction_status || "unknown",
      signature: payload.signature_key,
      payload: payload as Prisma.InputJsonValue,
      isVerified
    }
  });

  if (!isVerified) {
    return NextResponse.json({ message: "Signature webhook tidak valid" }, { status: 401 });
  }

  if (!payment) return NextResponse.json({ message: "Payment tidak ditemukan" }, { status: 404 });

  const status = mapGatewayStatus(payload.transaction_status, payload.fraud_status);
  const paymentStatus = status.toUpperCase() as PaymentStatus;
  const bookingStatus = status === "paid"
    ? BookingStatus.CONFIRMED
    : ["failed", "expired"].includes(status)
      ? BookingStatus.EXPIRED
      : status === "refunded"
        ? BookingStatus.CANCELLED
        : undefined;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        rawResponse: payload as Prisma.InputJsonValue,
        paidAt: status === "paid" ? new Date() : undefined
      }
    }),
    ...(bookingStatus ? [prisma.booking.update({ where: { id: payment.bookingId }, data: { status: bookingStatus } })] : [])
  ]);

  return NextResponse.json({ received: true, status });
}
