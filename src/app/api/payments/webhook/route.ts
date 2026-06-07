import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider, type Prisma } from "@prisma/client";
import { errorDetails, getRequestContext, logger } from "@/lib/logger";
import { mapGatewayStatus, verifyMidtransSignature } from "@/lib/payment";
import { applyMidtransStatusPayload, shouldApplyPaymentStatus, toPaymentStatus } from "@/lib/payment-sync";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request, "api.payments.webhook");

  try {
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
      logger.warn("payment_webhook.invalid_signature", {
        ...context,
        orderId: payload.order_id,
        transactionStatus: payload.transaction_status
      });
      return NextResponse.json({ message: "Signature webhook tidak valid" }, { status: 401, headers: { "x-request-id": context.requestId } });
    }

    if (!payment) {
      logger.warn("payment_webhook.payment_not_found", {
        ...context,
        orderId: payload.order_id,
        transactionId: payload.transaction_id,
        transactionStatus: payload.transaction_status
      });
      return NextResponse.json({ message: "Payment tidak ditemukan" }, { status: 404, headers: { "x-request-id": context.requestId } });
    }

    const status = mapGatewayStatus(payload.transaction_status, payload.fraud_status);
    const paymentStatus = toPaymentStatus(status);

    if (!shouldApplyPaymentStatus(payment.status, paymentStatus)) {
      logger.info("payment_webhook.ignored_out_of_order_status", {
        ...context,
        paymentId: payment.id,
        currentStatus: payment.status,
        incomingStatus: paymentStatus,
        orderId: payload.order_id
      });
      return NextResponse.json({ received: true, status, ignored: true }, { headers: { "x-request-id": context.requestId } });
    }

    await applyMidtransStatusPayload({
      payment,
      payload: payload as Prisma.InputJsonObject,
      eventTypePrefix: "webhook",
      recordEvent: false
    });

    logger.info("payment_webhook.applied", {
      ...context,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      orderId: payload.order_id,
      transactionId: payload.transaction_id,
      transactionStatus: payload.transaction_status,
      mappedStatus: status
    });

    return NextResponse.json({ received: true, status }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    logger.error("payment_webhook.failed", {
      ...context,
      error: errorDetails(error)
    });
    return NextResponse.json({ message: "Webhook payment gagal diproses" }, { status: 500, headers: { "x-request-id": context.requestId } });
  }
}
