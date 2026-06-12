import crypto from "crypto";
import type { Booking, User } from "@prisma/client";
import { logger } from "@/lib/logger";

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

export function isDevPaymentConfirmEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_PAYMENT_CONFIRM_ENABLED === "true";
}

export function verifyMidtransSignature(payload: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return process.env.PAYMENT_GATEWAY === "mock" && process.env.NODE_ENV !== "production";
  }
  const source = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(source).digest("hex");
  return expected === payload.signature_key;
}

export function mapGatewayStatus(transactionStatus?: string, fraudStatus?: string) {
  if (transactionStatus === "capture" && fraudStatus === "accept") return "paid";
  if (transactionStatus === "settlement") return "paid";
  if (["deny", "cancel", "failure"].includes(transactionStatus || "")) return "failed";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "refund") return "refunded";
  return "pending";
}

const MIDTRANS_TIMEOUT_MS = Number(process.env.MIDTRANS_TIMEOUT_MS ?? 10000);

function getMidtransBaseUrl(kind: "snap" | "core") {
  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
  if (kind === "snap") return production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
  return production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function getMidtransAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function assertMidtransSuccess(response: Response, body: { status_code?: string; status_message?: string }, fallback: string) {
  const statusCode = body.status_code ? Number(body.status_code) : response.status;
  if (!response.ok || statusCode >= 400) {
    throw new PaymentGatewayError(body.status_message || fallback);
  }
}

function buildCustomerDetails(user: Pick<User, "name" | "email" | "phone">) {
  const [firstName, ...last] = user.name.split(" ");
  return {
    first_name: firstName || user.name,
    last_name: last.join(" ") || undefined,
    email: user.email,
    phone: user.phone || undefined
  };
}

function buildItemDetails(booking: Booking) {
  const items = [
    {
      id: `BOOKING-${booking.bookingCode}`,
      price: booking.subtotal,
      quantity: 1,
      name: `Sewa lapangan ${booking.bookingCode}`.slice(0, 50)
    }
  ];

  if (booking.serviceFee > 0) {
    items.push({
      id: "SERVICE-FEE",
      price: booking.serviceFee,
      quantity: 1,
      name: "Biaya layanan"
    });
  }

  return items;
}

async function readMidtransJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    logger.warn("midtrans.response_json_failed", {
      status: response.status,
      error
    });
    return { status_code: String(response.status), status_message: "Midtrans mengembalikan response tidak valid" };
  }
}

export async function createMidtransSnapTransaction(input: {
  booking: Booking;
  user: Pick<User, "name" | "email" | "phone">;
  finishUrl?: string;
}) {
  const res = await fetch(`${getMidtransBaseUrl("snap")}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Authorization": getMidtransAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS),
    body: JSON.stringify({
      transaction_details: {
        order_id: input.booking.id,
        gross_amount: input.booking.total
      },
      item_details: buildItemDetails(input.booking),
      customer_details: buildCustomerDetails(input.user),
      custom_field1: input.booking.bookingCode,
      callbacks: {
        finish: input.finishUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/status?bookingId=${input.booking.id}`
      },
      expiry: {
        unit: "minute",
        duration: Number(process.env.BOOKING_LOCK_MINUTES ?? 15)
      }
    })
  });

  const json = await readMidtransJson(res);
  assertMidtransSuccess(res, json, "Gagal membuat transaksi Snap Midtrans");
  return json as { token: string; redirect_url: string };
}

export async function getMidtransTransactionStatus(orderId: string) {
  const res = await fetch(`${getMidtransBaseUrl("core")}/v2/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      "Authorization": getMidtransAuthHeader(),
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS)
  });

  const json = await readMidtransJson(res);
  assertMidtransSuccess(res, json, "Gagal membaca status transaksi Midtrans");
  return json as {
    status_code?: string;
    status_message?: string;
    transaction_id?: string;
    order_id?: string;
    transaction_status?: string;
    fraud_status?: string;
    gross_amount?: string;
    signature_key?: string;
  };
}
