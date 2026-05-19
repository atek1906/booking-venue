import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourtBook",
  description: "Booking lapangan olahraga online dengan payment gateway."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <nav className="nav">
          <div className="shell nav-inner">
            <Link className="brand" href="/">
              <span className="brand-mark"><Dumbbell size={18} /></span>
              CourtBook
            </Link>
            <div className="nav-links">
              <Link href="/venues">Venue</Link>
              <Link href="/bookings">Riwayat</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/login">Login</Link>
              <Link href="/venues" className="btn secondary">Cari Lapangan</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
