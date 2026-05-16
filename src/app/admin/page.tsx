import { AdminShell } from "@/components/AdminShell";
import { formatRupiah } from "@/lib/booking";
import { venues } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const courts = venues.flatMap((venue) => venue.courts);
  return (
    <AdminShell>
      <div className="section-title">
        <div>
          <h2>Dashboard Admin Venue</h2>
          <p className="muted">Ringkasan pendapatan harian, mingguan, bulanan, dan operasional venue.</p>
        </div>
      </div>
      <div className="grid">
        <div className="panel"><p className="muted">Pendapatan hari ini</p><h2>{formatRupiah(1250000)}</h2></div>
        <div className="panel"><p className="muted">Pendapatan minggu ini</p><h2>{formatRupiah(8450000)}</h2></div>
        <div className="panel"><p className="muted">Pendapatan bulan ini</p><h2>{formatRupiah(33450000)}</h2></div>
      </div>
      <div className="panel">
        <h3>Operasional</h3>
        <div className="row"><span>Total venue</span><strong>{venues.length}</strong></div>
        <div className="row"><span>Total lapangan</span><strong>{courts.length}</strong></div>
        <div className="row"><span>Payment status</span><strong>pending, paid, failed, expired, refunded</strong></div>
      </div>
    </AdminShell>
  );
}
