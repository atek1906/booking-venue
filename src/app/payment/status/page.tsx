"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Clock } from "lucide-react";
import { formatRupiah } from "@/lib/booking";

function PaymentStatusContent() {
  const bookingId = useSearchParams().get("bookingId");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!bookingId) return;
    const res = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  async function simulate(status: "paid" | "failed" | "expired") {
    setLoading(true);
    await fetch("/api/payments/simulate", {
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

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <h1 style={{ margin: 0 }}>Status Pembayaran</h1>
          {!booking ? <p className="muted">Memuat pembayaran...</p> : (
            <>
              <div className="row"><span>Kode booking</span><strong>{booking.bookingCode}</strong></div>
              <div className="row"><span>Status booking</span><span className={`status ${booking.status}`}>{booking.status}</span></div>
              <div className="row"><span>Status pembayaran</span><span className={`status ${payment?.status}`}>{payment?.status || "pending"}</span></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(booking.total)}</strong></div>
              <p className="muted">Mode mock menyediakan tombol simulasi. Di mode Midtrans, halaman ini diarahkan ke Snap/redirect URL dan backend menunggu webhook tervalidasi.</p>
              <div className="chips">
                <button className="btn" disabled={loading} onClick={() => simulate("paid")}><CheckCircle2 size={18} /> Simulasi Paid</button>
                <button className="btn warning" disabled={loading} onClick={() => simulate("expired")}><Clock size={18} /> Simulasi Expired</button>
                <button className="btn danger" disabled={loading} onClick={() => simulate("failed")}><CircleX size={18} /> Simulasi Failed</button>
              </div>
            </>
          )}
        </div>
        <aside className="panel stack">
          <h2>Bukti Booking</h2>
          <p className="muted">QR code muncul setelah pembayaran berhasil.</p>
          {booking?.status === "confirmed" ? (
            <Link className="btn" href={`/bookings/${booking.id}`}>Lihat QR Booking</Link>
          ) : (
            <Link className="btn secondary" href="/bookings">Lihat Riwayat</Link>
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
