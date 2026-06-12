"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleUserRound, Dumbbell, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-client";
import { getBrowserSupabase } from "@/lib/supabase";
import type { AuthUser } from "@/lib/auth-server";

export function NavBar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/");
  }

  const isAdmin = user?.role === "VENUE_ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <nav className="nav">
      <div className="shell nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark"><Dumbbell size={18} /></span>
          CourtBook
        </Link>
        <div className="nav-links">
          <Link href="/venues">Venue</Link>
          <Link href="/bookings">Riwayat</Link>
          {isAdmin && <Link href="/admin">Admin</Link>}
          {checked && !user && <Link href="/login">Login</Link>}
          {user && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-white/90">
              <CircleUserRound size={16} /> {user.name.split(" ")[0]}
            </span>
          )}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 font-semibold text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} /> Keluar
            </button>
          )}
          <Link href="/venues" className="btn">Cari Lapangan</Link>
        </div>
      </div>
    </nav>
  );
}
