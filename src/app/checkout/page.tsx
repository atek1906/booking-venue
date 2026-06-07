"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CreditCard, Lock, LogIn, MapPin, WalletCards } from "lucide-react";
import { authFetch, getCurrentUser } from "@/lib/auth-client";
import { formatRupiah } from "@/lib/format";
import type { Court, Venue } from "@/lib/types";

type CourtContext = {
  court: Court;
  venue: Venue;
};

type AvailabilitySlot = {
  time: string;
  startsAt: string;
  endsAt: string;
  status: "available" | "booked" | "unavailable" | "past";
  reason?: string;
  pricePerHour: number;
};

type AvailabilityDay = {
  date: string;
  slots: AvailabilitySlot[];
};

type AvailabilityResponse = CourtContext & {
  timezone: string;
  days: AvailabilityDay[];
};

function todayInputValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function statusLabel(status: AvailabilitySlot["status"]) {
  if (status === "available") return "Tersedia";
  if (status === "booked") return "Terisi";
  if (status === "unavailable") return "Ditutup";
  return "Lewat";
}

function CheckoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const courtId = search.get("courtId") || "";
  const [context, setContext] = useState<CourtContext | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [date, setDate] = useState(search.get("date") || todayInputValue());
  const [startTime, setStartTime] = useState(search.get("startTime") || "18:00");
  const [durationHours, setDurationHours] = useState(Number(search.get("durationHours") || 1));
  const [message, setMessage] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const returnTo = `/checkout?courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(startTime)}&durationHours=${durationHours}`;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const selectedSlot = useMemo(() => availability?.days
    .find((day) => day.date === date)
    ?.slots.find((slot) => slot.time === startTime), [availability, date, startTime]);
  const pricePerHour = selectedSlot?.pricePerHour || context?.court.pricePerHour || 0;
  const total = useMemo(() => (pricePerHour * durationHours) + 5000, [pricePerHour, durationHours]);

  useEffect(() => {
    getCurrentUser().then((user) => setIsLoggedIn(Boolean(user)));
  }, []);

  useEffect(() => {
    if (!courtId) return;
    fetch(`/api/courts/${courtId}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setContext(json))
      .catch(() => setContext(null));
  }, [courtId]);

  useEffect(() => {
    if (!courtId) return;
    setAvailabilityMessage("");
    fetch(`/api/courts/${courtId}/availability?start=${encodeURIComponent(todayInputValue())}&days=7&durationHours=${durationHours}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Gagal memuat availability")))
      .then((json: AvailabilityResponse) => {
        setAvailability(json);
        const initialSlot = json.days
          .flatMap((day) => day.slots.map((slot) => ({ day, slot })))
          .find(({ day, slot }) => (
            (day.date === date && slot.time === startTime && slot.status === "available") || slot.status === "available"
          ));
        if (initialSlot) {
          setDate(initialSlot.day.date);
          setStartTime(initialSlot.slot.time);
        }
      })
      .catch((error) => {
        setAvailability(null);
        setAvailabilityMessage(error instanceof Error ? error.message : "Gagal memuat availability");
      });
  }, [courtId, durationHours]);

  async function payNow() {
    if (!isLoggedIn) {
      router.push(loginHref);
      return;
    }
    if (!selectedSlot || selectedSlot.status !== "available") {
      setMessage("Pilih slot yang masih tersedia sebelum melanjutkan pembayaran.");
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
      body: JSON.stringify({ bookingId })
    });
    const paymentJson = await paymentRes.json();
    setLoading(false);

    if (!paymentRes.ok) {
      setMessage(paymentJson.message || "Gagal membuat transaksi pembayaran");
      return;
    }

    if (paymentJson.payment?.invoiceUrl) {
      window.location.assign(paymentJson.payment.invoiceUrl);
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
            <h1 className="page-heading">Pilih slot dan lanjut bayar</h1>
            <p className="card-meta page-subtitle"><MapPin size={16} /> {venue.name} / {court.name}</p>
          </div>
          <div className="checkout-toolbar">
            <div className="field">
              <label>Durasi</label>
              <select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>
                <option value={1}>1 jam</option>
                <option value={2}>2 jam</option>
                <option value={3}>3 jam</option>
              </select>
            </div>
            <div className="mini-summary">
              <span>Harga slot</span>
              <strong>{formatRupiah(pricePerHour)}/jam</strong>
            </div>
          </div>
          <div className="field">
            <label>Availability 7 hari ke depan</label>
            {availabilityMessage && <p style={{ color: "#dc2626", margin: 0 }}>{availabilityMessage}</p>}
            <div className="availability-board">
              {availability?.days.map((day) => (
                <div className="day-column" key={day.date}>
                  <strong>{formatDay(day.date)}</strong>
                  <span className="muted">{day.date}</span>
                  <div className="day-slots">
                    {day.slots.map((slot) => (
                      <button
                        className={`slot ${date === day.date && startTime === slot.time ? "active" : ""} ${slot.status}`}
                        disabled={slot.status !== "available"}
                        key={`${day.date}-${slot.time}`}
                        onClick={() => {
                          setDate(day.date);
                          setStartTime(slot.time);
                        }}
                        title={slot.reason || statusLabel(slot.status)}
                        type="button"
                      >
                        <span>{slot.time}</span>
                        <small>{statusLabel(slot.status)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="payment-route">
            <WalletCards size={20} />
            <span>
              <strong>Midtrans</strong>
              <small>Pilihan kartu, virtual account, e-wallet, atau metode lain tampil di halaman Midtrans.</small>
            </span>
          </div>
          <p className="notice muted"><CreditCard size={18} /> Booking dibuat dulu, lalu pembayaran dibuka melalui Midtrans.</p>
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
          <div className="row"><span>Tanggal</span><strong>{formatDay(date)}</strong></div>
          <div className="row"><span>Jam mulai</span><strong>{startTime}</strong></div>
          <div className="row"><span>Harga</span><strong>{formatRupiah(pricePerHour)}/jam</strong></div>
          <div className="row"><span>Durasi</span><strong>{durationHours} jam</strong></div>
          <div className="row"><span>Biaya layanan</span><strong>{formatRupiah(5000)}</strong></div>
          <div className="row total-row"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
          <p className="notice muted"><Lock size={18} /> Slot dikunci 15 menit setelah checkout dibuat.</p>
          {selectedSlot && selectedSlot.status !== "available" && <p className="notice muted">Slot yang dipilih sudah tidak tersedia. Pilih slot lain di kalender.</p>}
          {isLoggedIn ? (
            <button className="btn full" onClick={payNow} disabled={loading || selectedSlot?.status !== "available"}>
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
