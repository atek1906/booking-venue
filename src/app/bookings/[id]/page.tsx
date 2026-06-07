"use client";

import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { formatDateTime, formatRupiah, formatStatus } from "@/lib/format";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    authFetch(`/api/bookings/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setMessage(json.message || "Booking tidak ditemukan.");
          return;
        }
        setData(json);
      });
  }, [id]);

  const booking = data?.booking;
  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <h1 className="page-heading">Detail Booking</h1>
          {message && <p className="notice muted">{message}</p>}
          {!booking && !message ? <p className="muted">Memuat booking...</p> : booking ? (
            <>
              <div className="row"><span>Kode</span><strong>{booking.bookingCode}</strong></div>
              <div className="row"><span>Venue</span><strong>{data.venue?.name}</strong></div>
              <div className="row"><span>Lapangan</span><strong>{data.court?.name}</strong></div>
              <div className="row"><span>Jadwal</span><strong>{formatDateTime(booking.startsAt)}</strong></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(booking.total)}</strong></div>
              <div className="row"><span>Status</span><span className={`status ${booking.status}`}>{formatStatus(booking.status)}</span></div>
            </>
          ) : null}
        </div>
        <aside className="panel stack" style={{ alignItems: "center" }}>
          <h2>Bukti Booking</h2>
          {booking?.status === "confirmed" ? (
            <QRCodeSVG value={`${booking.bookingCode}|${booking.id}|${booking.startsAt}`} size={220} />
          ) : (
            <p className="muted">QR code aktif setelah pembayaran berstatus paid/confirmed.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
