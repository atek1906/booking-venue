"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Clock, ExternalLink, ReceiptText, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatRupiah, formatStatus } from "@/lib/format";

function PaymentStatusContent() {
  const bookingId = useSearchParams().get("bookingId");
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const devConfirmEnabled = process.env.NEXT_PUBLIC_DEMO_PAYMENT_CONFIRM_ENABLED === "true";

  async function load() {
    if (!bookingId) return;
    const res = await authFetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setMessage("");
      return json;
    }
    const json = await res.json().catch(() => ({}));
    setMessage(json.message || "Gagal memuat status pembayaran.");
    return null;
  }

  async function syncFromMidtrans(showSuccessMessage = true) {
    if (!bookingId) return null;
    setSyncing(true);
    const res = await authFetch("/api/payments/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId })
    });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);

    if (!res.ok) {
      setMessage(json.message || "Gagal sinkronisasi status Midtrans.");
      return null;
    }

    if (json.booking) setData(json.booking);
    if (showSuccessMessage) setMessage("Status berhasil disinkronkan dari Midtrans.");
    return json.booking;
  }

  async function simulate(status: "paid" | "failed" | "expired") {
    setLoading(true);
    const res = await authFetch("/api/payments/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, status })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.message || "Simulasi pembayaran gagal.");
    }
    await load();
    setLoading(false);
  }

  async function confirmPaidLocally() {
    setLoading(true);
    const res = await authFetch("/api/payments/dev-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.message || "Konfirmasi lokal gagal.");
    }
    await load();
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      const current = await load();
      if (!active) return;
      if (current?.payment?.provider === "midtrans" && current.payment.status === "pending") {
        await syncFromMidtrans(false);
      }
    }

    run();
    return () => { active = false; };
  }, [bookingId]);

  const booking = data?.booking;
  const payment = data?.payment;
  const isPaid = payment?.status === "paid" || booking?.status === "confirmed";

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <div>
            <div className="eyebrow"><ReceiptText size={15} /> Payment status</div>
            <h1 className="page-heading">Status pembayaran</h1>
          </div>
          {message && <p style={{ color: "#dc2626", margin: 0 }}>{message}</p>}
          {!booking ? <p className="muted">{bookingId ? "Memuat pembayaran..." : "Booking tidak ditemukan."}</p> : (
            <>
              <div className="row"><span>Kode booking</span><strong>{booking.bookingCode}</strong></div>
              <div className="row"><span>Status booking</span><span className={`status ${booking.status}`}>{formatStatus(booking.status)}</span></div>
              <div className="row"><span>Status pembayaran</span><span className={`status ${payment?.status}`}>{formatStatus(payment?.status)}</span></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(booking.total)}</strong></div>
              {payment?.provider === "midtrans" ? (
                <>
                  {isPaid ? (
                    <p className="notice"><CheckCircle2 size={18} className="shrink-0 text-emerald-700" /> Pembayaran diterima. Booking kamu sudah terkonfirmasi — tunjukkan QR booking saat datang ke venue.</p>
                  ) : (
                    <p className="notice muted"><Clock size={18} className="shrink-0" /> Selesaikan pembayaran di Midtrans. Status booking berubah otomatis setelah webhook tervalidasi.</p>
                  )}
                  <div className="chips">
                    {!isPaid && payment.invoiceUrl && <a className="btn" href={payment.invoiceUrl}><ExternalLink size={18} /> Bayar di Midtrans</a>}
                    {booking.status !== "confirmed" && (
                      <button className="btn secondary" disabled={syncing} onClick={() => syncFromMidtrans()}>
                        <RefreshCw size={18} /> {syncing ? "Sync..." : "Sync dari Midtrans"}
                      </button>
                    )}
                    {devConfirmEnabled && booking.status !== "confirmed" && (
                      <button className="btn secondary" disabled={loading} onClick={confirmPaidLocally}>
                        <CheckCircle2 size={18} /> Confirm Paid Lokal
                      </button>
                    )}
                  </div>
                  {devConfirmEnabled && <p className="notice muted">Mode lokal aktif: setelah mencoba sandbox Midtrans, tombol confirm lokal bisa dipakai untuk menyelesaikan user story tanpa webhook publik.</p>}
                </>
              ) : (
                <>
                  <p className="notice muted"><Clock size={18} /> Mode mock menyediakan tombol simulasi untuk mencoba alur pembayaran.</p>
                  <div className="chips">
                    {devConfirmEnabled ? (
                      <>
                        <button className="btn" disabled={loading} onClick={() => simulate("paid")}><CheckCircle2 size={18} /> Simulasi Paid</button>
                        <button className="btn warning" disabled={loading} onClick={() => simulate("expired")}><Clock size={18} /> Simulasi Expired</button>
                        <button className="btn danger" disabled={loading} onClick={() => simulate("failed")}><CircleX size={18} /> Simulasi Failed</button>
                      </>
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>Simulasi pembayaran hanya tersedia saat mode demo lokal aktif.</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <aside className="panel stack booking-summary">
          <div className="status-visual">
            {booking?.status === "confirmed" ? <CheckCircle2 size={52} /> : <Clock size={52} />}
            <h2 style={{ margin: 0 }}>{booking?.status === "confirmed" ? "Booking terkonfirmasi" : "Menunggu pembayaran"}</h2>
            <p style={{ margin: "8px 0 0", opacity: .82 }}>QR code aktif setelah status pembayaran berhasil.</p>
          </div>
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
