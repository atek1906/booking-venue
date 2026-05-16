"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { formatRupiah } from "@/lib/booking";

export default function AdminBookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { fetch("/api/bookings").then((res) => res.json()).then((json) => setItems(json.bookings || [])); }, []);
  return (
    <AdminShell>
      <div className="section-title"><h2>Manajemen Booking</h2></div>
      <table className="table">
        <thead><tr><th>Kode</th><th>Customer</th><th>Venue</th><th>Jadwal</th><th>Total</th><th>Booking</th><th>Payment</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.booking.id}>
              <td>{item.booking.bookingCode}</td><td>{item.booking.userName}</td><td>{item.venue?.name}</td><td>{new Date(item.booking.startsAt).toLocaleString("id-ID")}</td><td>{formatRupiah(item.booking.total)}</td><td><span className={`status ${item.booking.status}`}>{item.booking.status}</span></td><td><span className={`status ${item.payment?.status}`}>{item.payment?.status || "pending"}</span></td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={7} className="muted">Belum ada booking masuk di sesi demo.</td></tr>}
        </tbody>
      </table>
    </AdminShell>
  );
}
