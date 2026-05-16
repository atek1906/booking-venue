import { AdminShell } from "@/components/AdminShell";
import { formatRupiah } from "@/lib/booking";

export default function AdminReportsPage() {
  const rows = [
    ["Harian", 12, 1250000, 3],
    ["Mingguan", 74, 8450000, 18],
    ["Bulanan", 288, 33450000, 64]
  ];
  return (
    <AdminShell>
      <div className="section-title"><h2>Laporan Transaksi</h2><button className="btn secondary">Export CSV</button></div>
      <table className="table">
        <thead><tr><th>Periode</th><th>Booking paid</th><th>Gross revenue</th><th>Pending/expired</th></tr></thead>
        <tbody>
          {rows.map(([period, paid, revenue, pending]) => (
            <tr key={String(period)}><td>{period}</td><td>{paid}</td><td>{formatRupiah(Number(revenue))}</td><td>{pending}</td></tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
