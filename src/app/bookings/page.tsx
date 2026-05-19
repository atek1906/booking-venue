"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { formatRupiah } from "@/lib/format";

export default function BookingHistoryPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    authFetch("/api/bookings", { cache: "no-store" }).then((res) => res.json()).then((json) => setItems(json.bookings || []));
  }, []);

  return (
    <main className="section">
      <div className="shell stack">
        <div className="section-title">
          <div>
            <h2>Riwayat Booking</h2>
            <p className="muted">Customer dapat melihat status pembayaran, pembatalan, dan bukti booking.</p>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Kode</th><th>Venue</th><th>Lapangan</th><th>Jadwal</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.booking.id}>
                <td>{item.booking.bookingCode}</td>
                <td>{item.venue?.name}</td>
                <td>{item.court?.name}</td>
                <td>{new Date(item.booking.startsAt).toLocaleString("id-ID")}</td>
                <td>{formatRupiah(item.booking.total)}</td>
                <td><span className={`status ${item.booking.status}`}>{item.booking.status}</span></td>
                <td><Link className="btn secondary" href={`/bookings/${item.booking.id}`}>Detail</Link></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="muted">Belum ada booking di sesi demo ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
