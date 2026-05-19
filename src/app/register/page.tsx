"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { safeReturnTo } from "@/lib/navigation";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage("Registrasi berhasil. Cek email untuk verifikasi, lalu login kembali.");
      setLoading(false);
      return;
    }

    await authFetch("/api/auth/sync", { method: "POST" });
    setLoading(false);
    router.replace(returnTo);
  }

  return (
    <main className="section">
      <div className="shell" style={{ maxWidth: 560 }}>
        <form className="panel stack" onSubmit={handleRegister}>
          <div>
            <div className="eyebrow"><UserPlus size={15} /> Akun customer</div>
            <h1 style={{ margin: 0 }}>Registrasi Customer</h1>
            <p className="muted">Akun baru otomatis dibuat sebagai customer. Role admin tidak tersedia dari halaman ini.</p>
          </div>
          {!isSupabaseConfigured() && <p className="notice muted">Supabase belum dikonfigurasi untuk environment ini.</p>}
          <div className="field"><label>Nama</label><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" required /></div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></div>
          <div className="field"><label>Nomor WhatsApp</label><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+62812..." /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          {message && <p style={{ color: "#dc2626", margin: 0 }}>{message}</p>}
          <button className="btn full" type="submit" disabled={loading}>{loading ? "Memproses..." : "Buat Akun"}</button>
          <Link className="muted" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sudah punya akun? Login</Link>
        </form>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="shell section">Memuat registrasi...</main>}>
      <RegisterContent />
    </Suspense>
  );
}
