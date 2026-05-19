"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/venues", "Manajemen Venue"],
  ["/admin/courts", "Manajemen Lapangan"],
  ["/admin/schedules", "Manajemen Jadwal"],
  ["/admin/bookings", "Manajemen Booking"],
  ["/admin/reports", "Laporan Transaksi"]
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const role = json?.user?.role;
        if (role === "VENUE_ADMIN" || role === "SUPER_ADMIN") {
          setAllowed(true);
          return;
        }
        router.replace(`/login?returnTo=${encodeURIComponent("/admin")}`);
      })
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) return <main className="shell section">Memeriksa akses admin...</main>;
  if (!allowed) return <main className="shell section">Mengalihkan ke login...</main>;

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
