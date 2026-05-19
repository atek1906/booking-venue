import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { VenueCard } from "@/components/VenueCard";
import { listVenues } from "@/lib/db-data";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Slot terkunci",
    copy: "Checkout pending mengunci jadwal sementara agar sesi favorit tidak diambil orang lain.",
    Icon: CalendarCheck
  },
  {
    title: "Payment siap",
    copy: "Mode mock bisa dicoba sekarang, dan integrasi Midtrans sudah disiapkan lewat API.",
    Icon: CreditCard
  },
  {
    title: "Status aman",
    copy: "Pembayaran paid hanya diproses backend setelah callback gateway tervalidasi.",
    Icon: ShieldCheck
  }
];

export default async function HomePage() {
  const venues = await listVenues();

  return (
    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow"><Sparkles size={15} /> Booking cepat untuk komunitas aktif</div>
            <h1>Temukan lapangan, pilih jam, bayar online.</h1>
            <p>CourtBook membuat alur booking terasa ringkas: cari venue yang cocok, cek pilihan court, kunci jadwal saat checkout, lalu selesaikan pembayaran dalam satu flow yang jelas.</p>
            <div className="hero-actions">
              <Link className="btn" href="/venues">Cari Lapangan <ArrowRight size={18} /></Link>
              <Link className="btn secondary" href="/bookings">Cek Booking</Link>
            </div>
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
            <div className="hero-card">
              <div>
                <strong>Arena Senayan</strong>
                <span className="card-meta"><MapPin size={15} /> Gelora, Jakarta Pusat</span>
              </div>
              <Link className="btn secondary" href="/venues/arena-senayan">Lihat slot</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-title">
            <div>
              <h2>Venue Pilihan</h2>
              <p className="muted">Mulai dari futsal sepulang kerja sampai badminton akhir pekan.</p>
            </div>
            <Link className="btn secondary" href="/venues">Lihat Semua</Link>
          </div>
          <div className="grid">
            {venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell feature-grid">
          {features.map(({ title, copy, Icon }) => (
            <div className="panel stack" key={title}>
              <Icon size={28} color="#0f766e" />
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p className="muted" style={{ margin: 0 }}>{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
