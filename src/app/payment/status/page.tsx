"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Clock, ExternalLink, QrCode, ReceiptText } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatRupiah } from "@/lib/format";
import { extractQrisUrl } from "@/lib/payment-client";

function PaymentStatusContent() {
  const bookingId = useSearchParams().get("bookingId");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!bookingId) return;
    const res = await authFetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  async function simulate(status: "paid" | "failed" | "expired") {
    setLoading(true);
    await authFetch("/api/payments/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, status })
    });
    await load();
    setLoading(false);
  }

  useEffect(() => { load(); }, [bookingId]);

  const booking = data?.booking;
  const payment = data?.payment;
  const qrisUrl = extractQrisUrl(payment?.rawResponse);

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <div>
            <div className="eyebrow"><ReceiptText size={15} /> Payment status</div>
            <h1 style={{ margin: 0 }}>Status pembayaran</h1>
          </div>
          {!booking ? <p className="muted">Memuat pembayaran...</p> : (
            <>
              <div className="row"><span>Kode booking</span><strong>{booking.bookingCode}</strong></div>
              <div className="row"><span>Status booking</span><span className={`status ${booking.status}`}>{booking.status}</span></div>
              <div className="row"><span>Status pembayaran</span><span className={`status ${payment?.status}`}>{payment?.status || "pending"}</span></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(booking.total)}</strong></div>
              {payment?.provider === "midtrans" ? (
                <>
                  <p className="notice muted"><Clock size={18} /> Selesaikan pembayaran di Midtrans. Status booking akan berubah setelah webhook tervalidasi.</p>
                  <div className="chips">
                    {payment.invoiceUrl && <Link className="btn" href={payment.invoiceUrl} target="_blank"><ExternalLink size={18} /> Bayar di Midtrans</Link>}
                    {qrisUrl && <Link className="btn secondary" href={qrisUrl} target="_blank"><QrCode size={18} /> Buka QRIS</Link>}
                  </div>
                </>
              ) : (
                <>
                  <p className="notice muted"><Clock size={18} /> Mode mock menyediakan tombol simulasi untuk mencoba alur pembayaran.</p>
                  <div className="chips">
                    <button className="btn" disabled={loading} onClick={() => simulate("paid")}><CheckCircle2 size={18} /> Simulasi Paid</button>
                    <button className="btn warning" disabled={loading} onClick={() => simulate("expired")}><Clock size={18} /> Simulasi Expired</button>
                    <button className="btn danger" disabled={loading} onClick={() => simulate("failed")}><CircleX size={18} /> Simulasi Failed</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <aside className="panel stack booking-summary">
          <div className="status-visual">
            {booking?.status === "confirmed" ? <CheckCircle2 size={52} /> : <Clock size={52} />}
            <h2 style={{ margin: 0 }}>{booking?.status === "confirmed" ? "Booking confirmed" : "Menunggu pembayaran"}</h2>
            <p style={{ margin: "8px 0 0", opacity: .82 }}>QR code aktif setelah status pembayaran berhasil.</p>
          </div>
          {qrisUrl && booking?.status !== "confirmed" && (
            <div className="panel stack" style={{ boxShadow: "none", alignItems: "center" }}>
              <img src={qrisUrl} alt="QRIS Midtrans" style={{ width: 220, height: 220, objectFit: "contain" }} />
              <p className="muted" style={{ margin: 0, textAlign: "center" }}>Scan QRIS ini melalui aplikasi pembayaran yang mendukung QRIS.</p>
            </div>
          )}
          {booking?.status === "confirmed" ? (
            <Link className="btn full" href={`/bookings/${booking.id}`}>Lihat QR Booking</Link>
          ) : (
            <Link className="btn secondary full" href="/bookings">Lihat Riwayat</Link>
          )}
        </aside>
      </div>
    </main>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<main className="shell section">Memuat pembayaran...</main>}>
      <PaymentStatusContent />
    </Suspense>
  );
}
