import Link from "next/link";
import { CalendarCheck, CreditCard, ShieldCheck } from "lucide-react";
import { VenueCard } from "@/components/VenueCard";
import { venues } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <h1>Booking lapangan olahraga tanpa telepon bolak-balik.</h1>
            <p>Cari venue, pilih slot kosong, kunci jadwal saat checkout, lalu bayar online melalui payment gateway. CourtBook menyiapkan alur customer, admin venue, dan audit pembayaran dalam satu aplikasi.</p>
            <form className="search-panel" action="/venues">
              <div className="field">
                <label>Olahraga</label>
                <select name="sport" defaultValue="">
                  <option value="">Semua olahraga</option>
                  <option value="FUTSAL">Futsal</option>
                  <option value="BADMINTON">Badminton</option>
                  <option value="BASKET">Basket</option>
                  <option value="TENNIS">Tenis</option>
                  <option value="MINI_SOCCER">Mini soccer</option>
                </select>
              </div>
              <div className="field">
                <label>Lokasi</label>
                <input name="location" placeholder="Jakarta, BSD, Bekasi" />
              </div>
              <div className="field">
                <label>Tanggal</label>
                <input name="date" type="date" />
              </div>
              <button className="btn" type="submit">Cari</button>
            </form>
          </div>
          <div className="hero-photo">
            <img src="https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80" alt="Pemain olahraga di lapangan" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-title">
            <h2>Venue Pilihan</h2>
            <Link className="btn secondary" href="/venues">Lihat Semua</Link>
          </div>
          <div className="grid">
            {venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell grid">
          {[
            ["Slot terkunci", "Booking pending mengunci slot sementara agar tidak double booking.", CalendarCheck],
            ["Payment gateway", "Mode mock tersedia, Midtrans siap dipasang melalui API dan webhook.", CreditCard],
            ["Webhook aman", "Status paid hanya berubah dari backend setelah signature callback diverifikasi.", ShieldCheck]
          ].map(([title, copy, Icon]) => (
            <div className="panel stack" key={String(title)}>
              <Icon size={28} color="#0f766e" />
              <h3 style={{ margin: 0 }}>{String(title)}</h3>
              <p className="muted" style={{ margin: 0 }}>{String(copy)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
