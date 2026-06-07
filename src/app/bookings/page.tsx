"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { formatDateTime, formatRupiah, formatStatus } from "@/lib/format";

export default function BookingHistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    authFetch("/api/bookings", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setMessage(json.message || "Login diperlukan untuk melihat booking.");
          return;
        }
        setItems(json.bookings || []);
      });
  }, []);

  return (
    <main className="section">
      <div className="shell stack">
        <div className="section-title">
          <div>
            <h2>Riwayat Booking</h2>
            <p className="muted">Customer dapat melihat status pembayaran, pembatalan, dan bukti booking.</p>
          </div>
          {message && <Link className="btn" href={`/login?returnTo=${encodeURIComponent("/bookings")}`}>Login untuk melihat booking</Link>}
        </div>
        {message && <p className="notice muted">{message}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Kode</th><th>Venue</th><th>Lapangan</th><th>Jadwal</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.booking.id}>
                  <td>{item.booking.bookingCode}</td>
                  <td>{item.venue?.name}</td>
                  <td>{item.court?.name}</td>
                  <td>{formatDateTime(item.booking.startsAt)}</td>
                  <td>{formatRupiah(item.booking.total)}</td>
                  <td><span className={`status ${item.booking.status}`}>{formatStatus(item.booking.status)}</span></td>
                  <td><Link className="btn secondary" href={`/bookings/${item.booking.id}`}>Detail</Link></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="muted">Belum ada booking di sesi ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
