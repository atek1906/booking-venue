import Link from "next/link";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/venues", "Manajemen Venue"],
  ["/admin/courts", "Manajemen Lapangan"],
  ["/admin/schedules", "Manajemen Jadwal"],
  ["/admin/bookings", "Manajemen Booking"],
  ["/admin/reports", "Laporan Transaksi"]
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="section">
      <div className="shell admin-layout">
        <aside className="side">
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </aside>
        <div className="stack">{children}</div>
      </div>
    </main>
  );
}
