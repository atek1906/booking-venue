import { BookingStatus, PaymentProvider, PaymentStatus, type Payment, type Prisma } from "@prisma/client";
import { mapGatewayStatus } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export function toPaymentStatus(status: string) {
  if (status === "paid") return PaymentStatus.PAID;
  if (status === "failed") return PaymentStatus.FAILED;
  if (status === "expired") return PaymentStatus.EXPIRED;
  if (status === "refunded") return PaymentStatus.REFUNDED;
  return PaymentStatus.PENDING;
}

export function toBookingStatus(status: string) {
  if (status === "paid") return BookingStatus.CONFIRMED;
  if (status === "failed" || status === "expired") return BookingStatus.EXPIRED;
  if (status === "refunded") return BookingStatus.CANCELLED;
  return undefined;
}

export function shouldApplyPaymentStatus(current: PaymentStatus, next: PaymentStatus) {
  const failedFinalStatuses: PaymentStatus[] = [PaymentStatus.FAILED, PaymentStatus.EXPIRED];
  const finalStatuses: PaymentStatus[] = [PaymentStatus.FAILED, PaymentStatus.EXPIRED, PaymentStatus.REFUNDED];

  if (next === PaymentStatus.PENDING && current !== PaymentStatus.PENDING) return false;
  if (current === PaymentStatus.PAID && failedFinalStatuses.includes(next)) return false;
  if (finalStatuses.includes(current) && next === PaymentStatus.PENDING) return false;
  return true;
}

export async function applyMidtransStatusPayload(input: {
  payment: Payment;
  payload: Prisma.InputJsonObject & {
    transaction_status?: string;
    fraud_status?: string;
    transaction_id?: string;
    signature_key?: string;
  };
  eventTypePrefix?: string;
  recordEvent?: boolean;
}) {
  const status = mapGatewayStatus(input.payload.transaction_status, input.payload.fraud_status);
  const paymentStatus = toPaymentStatus(status);
  const bookingStatus = toBookingStatus(status);

  if (!shouldApplyPaymentStatus(input.payment.status, paymentStatus)) {
    return { status, paymentStatus, bookingStatus, applied: false };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: input.payment.id },
      data: {
        status: paymentStatus,
        providerTransactionId: input.payload.transaction_id || input.payment.providerTransactionId,
        rawResponse: input.payload,
        paidAt: status === "paid" ? new Date() : input.payment.paidAt
      }
    }),
    ...(bookingStatus ? [prisma.booking.update({ where: { id: input.payment.bookingId }, data: { status: bookingStatus } })] : []),
    ...(input.recordEvent === false ? [] : [
      prisma.paymentWebhook.create({
        data: {
          paymentId: input.payment.id,
          provider: PaymentProvider.MIDTRANS,
          eventType: `${input.eventTypePrefix || "status_sync"}:${input.payload.transaction_status || "unknown"}`,
          signature: typeof input.payload.signature_key === "string" ? input.payload.signature_key : null,
          payload: input.payload,
          isVerified: true
        }
      })
    ])
  ]);

  return { status, paymentStatus, bookingStatus, applied: true };
}
