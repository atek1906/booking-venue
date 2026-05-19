import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider, type Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth-server";
import { createStoredPayment, getBookingForUser } from "@/lib/db-data";
import { createMidtransQrisTransaction, createMidtransSnapTransaction, extractQrisUrl } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { bookingId, method = "snap" } = await request.json() as { bookingId: string; method?: "snap" | "qris" | "mock" };
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id },
      include: { user: true }
    });
    if (!booking) return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404 });
    if (booking.status !== "PENDING_PAYMENT") return NextResponse.json({ message: "Booking tidak bisa dibayar" }, { status: 400 });

    const gateway = process.env.PAYMENT_GATEWAY === "midtrans" ? "midtrans" : "mock";
    let payment;

    if (gateway === "midtrans" && method === "qris") {
      const response = await createMidtransQrisTransaction({ booking, user: booking.user });
      payment = await createStoredPayment({
        booking,
        provider: PaymentProvider.MIDTRANS,
        method,
        providerTransactionId: response.transaction_id || response.order_id,
        invoiceUrl: extractQrisUrl(response),
        rawResponse: response as Prisma.InputJsonValue
      });
    } else if (gateway === "midtrans") {
      const response = await createMidtransSnapTransaction({ booking, user: booking.user });
      payment = await createStoredPayment({
        booking,
        provider: PaymentProvider.MIDTRANS,
        method: "snap",
        providerTransactionId: booking.id,
        invoiceUrl: response.redirect_url,
        rawResponse: response as Prisma.InputJsonValue
      });
    } else {
      payment = await createStoredPayment({
        booking,
        provider: PaymentProvider.MOCK,
        method: "mock",
        providerTransactionId: `PAY-${Date.now()}`,
        invoiceUrl: `/payment/status?bookingId=${booking.id}`
      });
    }

    const view = await getBookingForUser(booking.id, user);
    return NextResponse.json({ payment, booking: view });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Gagal membuat transaksi pembayaran" }, { status: 500 });
  }
}
