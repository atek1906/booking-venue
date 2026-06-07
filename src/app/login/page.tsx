"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { safeReturnTo } from "@/lib/navigation";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [email, setEmail] = useState("user@courtbook.test");
  const [password, setPassword] = useState("password");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const demoAuthEnabled = process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === "true";

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (demoAuthEnabled) {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });
      const json = await response.json();
      if (!response.ok) {
        setMessage(json.message || "Login demo gagal.");
        setLoading(false);
        return;
      }

      setLoading(false);
      router.replace(returnTo);
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await authFetch("/api/auth/sync", { method: "POST" });
    setLoading(false);
    router.replace(returnTo);
  }

  return (
    <main className="section">
      <div className="shell" style={{ maxWidth: 520 }}>
        <form className="panel stack" onSubmit={handleLogin}>
          <div>
            <div className="eyebrow"><LogIn size={15} /> Masuk ke CourtBook</div>
            <h1 style={{ margin: 0 }}>Login</h1>
            <p className="muted">Masuk sebagai customer untuk mengunci slot dan melanjutkan pembayaran.</p>
          </div>
          {demoAuthEnabled ? (
            <p className="notice muted">Mode demo lokal aktif. Gunakan user@courtbook.test dan password untuk mencoba flow booking.</p>
          ) : !isSupabaseConfigured() && (
            <p className="notice muted">Supabase belum dikonfigurasi untuk environment ini.</p>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {message && <p style={{ color: "#dc2626", margin: 0 }}>{message}</p>}
          <button className="btn full" type="submit" disabled={loading}>{loading ? "Memproses..." : "Masuk dan lanjutkan"}</button>
          <Link className="muted" href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Belum punya akun? Registrasi</Link>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="shell section">Memuat login...</main>}>
      <LoginContent />
    </Suspense>
  );
}
