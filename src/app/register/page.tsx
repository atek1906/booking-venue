import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="section">
      <div className="shell" style={{ maxWidth: 560 }}>
        <form className="panel stack">
          <h1 style={{ margin: 0 }}>Registrasi Customer</h1>
          <div className="field"><label>Nama</label><input placeholder="Nama lengkap" /></div>
          <div className="field"><label>Email</label><input type="email" placeholder="nama@email.com" /></div>
          <div className="field"><label>Nomor WhatsApp</label><input placeholder="+62812..." /></div>
          <div className="field"><label>Password</label><input type="password" /></div>
          <Link className="btn" href="/venues">Buat Akun</Link>
          <Link className="muted" href="/login">Sudah punya akun? Login</Link>
        </form>
      </div>
    </main>
  );
}
