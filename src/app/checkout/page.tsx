"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CreditCard, Lock, LogIn, MapPin } from "lucide-react";
import { authFetch, getAccessToken } from "@/lib/auth-client";
import { formatRupiah } from "@/lib/format";
import type { Court, Venue } from "@/lib/types";

const times = ["06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00"];

type CourtContext = {
  court: Court;
  venue: Venue;
};

function CheckoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const courtId = search.get("courtId") || "";
  const [context, setContext] = useState<CourtContext | null>(null);
  const [date, setDate] = useState(search.get("date") || "2026-05-16");
  const [startTime, setStartTime] = useState(search.get("startTime") || "18:00");
  const [durationHours, setDurationHours] = useState(Number(search.get("durationHours") || 1));
  const [paymentMethod, setPaymentMethod] = useState<"snap" | "qris">("snap");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const total = useMemo(() => ((context?.court.pricePerHour || 0) * durationHours) + 5000, [context, durationHours]);
  const returnTo = `/checkout?courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(startTime)}&durationHours=${durationHours}`;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    getAccessToken().then((token) => setIsLoggedIn(Boolean(token)));
  }, []);

  useEffect(() => {
    if (!courtId) return;
    fetch(`/api/courts/${courtId}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setContext(json))
      .catch(() => setContext(null));
  }, [courtId]);

  async function payNow() {
    if (!isLoggedIn) {
      router.push(loginHref);
      return;
    }

    setLoading(true);
    setMessage("");
    const bookingRes = await authFetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courtId, date, startTime, durationHours })
    });
    const bookingJson = await bookingRes.json();
    if (!bookingRes.ok) {
      setMessage(bookingJson.message || "Gagal membuat booking");
      setLoading(false);
      return;
    }

    const bookingId = bookingJson.booking.booking.id;
    const paymentRes = await authFetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, method: paymentMethod })
    });
    const paymentJson = await paymentRes.json();
    setLoading(false);

    if (!paymentRes.ok) {
      setMessage(paymentJson.message || "Gagal membuat transaksi pembayaran");
      return;
    }

    router.push(`/payment/status?bookingId=${bookingId}`);
  }

  if (!courtId) return <main className="shell section">Lapangan tidak ditemukan.</main>;
  if (!context) return <main className="shell section">Memuat checkout...</main>;

  const { court, venue } = context;

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <div>
            <div className="eyebrow"><CalendarDays size={15} /> Checkout booking</div>
            <h1 style={{ margin: 0 }}>Pilih jadwal booking</h1>
            <p className="card-meta" style={{ marginTop: 10 }}><MapPin size={16} /> {venue.name} / {court.name}</p>
          </div>
          <div className="field">
            <label>Tanggal</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="field">
            <label>Jam mulai</label>
            <div className="slot-grid">
              {times.map((time) => (
                <button className={`slot ${startTime === time ? "active" : ""}`} key={time} onClick={() => setStartTime(time)} type="button">{time}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Durasi</label>
            <select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>
              <option value={1}>1 jam</option>
              <option value={2}>2 jam</option>
              <option value={3}>3 jam</option>
            </select>
          </div>
          <div className="field">
            <label>Metode pembayaran</label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "snap" | "qris")}>
              <option value="snap">Midtrans Snap</option>
              <option value="qris">QRIS in-app</option>
            </select>
          </div>
          {message && <p style={{ color: "#dc2626" }}>{message}</p>}
        </div>
        <aside className="panel stack booking-summary">
          <h2>Ringkasan pembayaran</h2>
          {isLoggedIn ? (
            <div className="notice muted"><LogIn size={18} /> Sesi login aktif.</div>
          ) : (
            <div className="notice muted"><LogIn size={18} /> Login diperlukan sebelum pembayaran.</div>
          )}
          <div className="row"><span>Lapangan</span><strong>{court.name}</strong></div>
          <div className="row"><span>Tanggal</span><strong>{date}</strong></div>
          <div className="row"><span>Jam mulai</span><strong>{startTime}</strong></div>
          <div className="row"><span>Harga</span><strong>{formatRupiah(court.pricePerHour)}/jam</strong></div>
          <div className="row"><span>Durasi</span><strong>{durationHours} jam</strong></div>
          <div className="row"><span>Biaya layanan</span><strong>{formatRupiah(5000)}</strong></div>
          <div className="row"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
          <p className="notice muted"><Lock size={18} /> Slot dikunci 15 menit setelah checkout dibuat.</p>
          {isLoggedIn ? (
            <button className="btn full" onClick={payNow} disabled={loading}>
              <CreditCard size={18} /> {loading ? "Memproses..." : "Bayar Sekarang"}
            </button>
          ) : (
            <Link className="btn full" href={loginHref}><LogIn size={18} /> Login untuk Bayar</Link>
          )}
        </aside>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="shell section">Memuat checkout...</main>}>
      <CheckoutContent />
    </Suspense>
  );
}
