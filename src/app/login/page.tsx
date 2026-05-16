import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="section">
      <div className="shell" style={{ maxWidth: 520 }}>
        <form className="panel stack">
          <h1 style={{ margin: 0 }}>Login</h1>
          <p className="muted">Demo auth untuk Customer, Admin Venue, dan Super Admin. Sambungkan ke NextAuth/JWT saat produksi.</p>
          <div className="field"><label>Email</label><input type="email" defaultValue="user@courtbook.test" /></div>
          <div className="field"><label>Password</label><input type="password" defaultValue="password" /></div>
          <div className="field">
            <label>Role</label>
            <select defaultValue="CUSTOMER">
              <option value="CUSTOMER">Customer</option>
              <option value="VENUE_ADMIN">Admin venue</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
          </div>
          <Link className="btn" href="/venues">Masuk</Link>
          <Link className="muted" href="/register">Belum punya akun? Registrasi</Link>
        </form>
      </div>
    </main>
  );
}
