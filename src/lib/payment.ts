import crypto from "crypto";
import type { Booking, User } from "@prisma/client";

export function verifyMidtransSignature(payload: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return process.env.PAYMENT_GATEWAY !== "midtrans";
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

function buildCustomerDetails(user: Pick<User, "name" | "email" | "phone">) {
  const [firstName, ...last] = user.name.split(" ");
  return {
    first_name: firstName || user.name,
    last_name: last.join(" ") || undefined,
    email: user.email,
    phone: user.phone || undefined
  };
}

export async function createMidtransSnapTransaction(input: {
  booking: Booking;
  user: Pick<User, "name" | "email" | "phone">;
}) {
  const res = await fetch(`${getMidtransBaseUrl("snap")}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Authorization": getMidtransAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.booking.id,
        gross_amount: input.booking.total
      },
      customer_details: buildCustomerDetails(input.user),
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/status?bookingId=${input.booking.id}`
      },
      expiry: {
        unit: "minute",
        duration: Number(process.env.BOOKING_LOCK_MINUTES ?? 15)
      }
    })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.status_message || "Gagal membuat transaksi Snap Midtrans");
  return json as { token: string; redirect_url: string };
}

export async function createMidtransQrisTransaction(input: {
  booking: Booking;
  user: Pick<User, "name" | "email" | "phone">;
}) {
  const res = await fetch(`${getMidtransBaseUrl("core")}/v2/charge`, {
    method: "POST",
    headers: {
      "Authorization": getMidtransAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: input.booking.id,
        gross_amount: input.booking.total
      },
      customer_details: buildCustomerDetails(input.user),
      qris: {
        acquirer: "gopay"
      }
    })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.status_message || "Gagal membuat transaksi QRIS Midtrans");
  return json as {
    transaction_id?: string;
    order_id: string;
    transaction_status: string;
    actions?: Array<{ name: string; method: string; url: string }>;
  };
}

export function extractQrisUrl(rawResponse: unknown) {
  const response = rawResponse as { actions?: Array<{ name: string; url: string }> } | null;
  return response?.actions?.find((action) => action.name === "generate-qr-code")?.url;
}
