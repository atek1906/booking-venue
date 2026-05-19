"use client";

import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { formatRupiah } from "@/lib/format";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    authFetch(`/api/bookings/${id}`, { cache: "no-store" }).then((res) => res.json()).then(setData);
  }, [id]);

  const booking = data?.booking;
  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="panel stack">
          <h1 style={{ margin: 0 }}>Detail Booking</h1>
          {!booking ? <p className="muted">Memuat booking...</p> : (
            <>
              <div className="row"><span>Kode</span><strong>{booking.bookingCode}</strong></div>
              <div className="row"><span>Venue</span><strong>{data.venue?.name}</strong></div>
              <div className="row"><span>Lapangan</span><strong>{data.court?.name}</strong></div>
              <div className="row"><span>Jadwal</span><strong>{new Date(booking.startsAt).toLocaleString("id-ID")}</strong></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(booking.total)}</strong></div>
              <div className="row"><span>Status</span><span className={`status ${booking.status}`}>{booking.status}</span></div>
            </>
          )}
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
