import crypto from "crypto";

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
