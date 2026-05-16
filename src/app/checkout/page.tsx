"use client";

import { Suspense } from "react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { findCourt, findVenueByCourt, formatRupiah } from "@/lib/booking";

const times = ["06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00"];

function CheckoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const courtId = search.get("courtId") || "c_futsal_a";
  const court = findCourt(courtId);
  const venue = findVenueByCourt(courtId);
  const [date, setDate] = useState("2026-05-16");
  const [startTime, setStartTime] = useState("18:00");
  const [durationHours, setDurationHours] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const total = useMemo(() => ((court?.pricePerHour || 0) * durationHours) + 5000, [court, durationHours]);

  async function payNow() {
    setLoading(true);
    setMessage("");
    const bookingRes = await fetch("/api/bookings", {
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
    await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId })
    });
    router.push(`/payment/status?bookingId=${bookingId}`);
  }

  if (!court || !venue) return <main className="shell section">Lapangan tidak ditemukan.</main>;

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <h1 style={{ margin: 0 }}>Pilih Jadwal Booking</h1>
          <p className="muted">{venue.name} · {court.name}</p>
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
          {message && <p style={{ color: "#dc2626" }}>{message}</p>}
        </div>
        <aside className="panel stack">
          <h2>Checkout</h2>
          <div className="row"><span>Lapangan</span><strong>{court.name}</strong></div>
          <div className="row"><span>Harga</span><strong>{formatRupiah(court.pricePerHour)}/jam</strong></div>
          <div className="row"><span>Durasi</span><strong>{durationHours} jam</strong></div>
          <div className="row"><span>Biaya layanan</span><strong>{formatRupiah(5000)}</strong></div>
          <div className="row"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
          <p className="muted" style={{ display: "flex", gap: 8 }}><Lock size={18} /> Slot dikunci 15 menit setelah checkout dibuat.</p>
          <button className="btn" onClick={payNow} disabled={loading}><CreditCard size={18} /> {loading ? "Memproses..." : "Bayar Sekarang"}</button>
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
