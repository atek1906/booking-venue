import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, MapPin, Search, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { VenueCard } from "@/components/VenueCard";
import { listVenues } from "@/lib/db-data";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Slot real-time",
    copy: "Jadwal tersedia, terkunci, dan terbayar dipisahkan jelas agar tidak ada double booking.",
    Icon: CalendarCheck
  },
  {
    title: "Bayar online",
    copy: "Customer lanjut ke satu pintu pembayaran Midtrans dari ringkasan checkout.",
    Icon: CreditCard
  },
  {
    title: "Bukti booking",
    copy: "Status booking dan QR bukti hadir setelah pembayaran tervalidasi dari backend.",
    Icon: ShieldCheck
  }
];

export default async function HomePage() {
  const venues = await listVenues();
  const featuredVenue = venues[0];
  const minPrice = featuredVenue?.courts.length ? Math.min(...featuredVenue.courts.map((court) => court.pricePerHour)) : 0;

  return (
    <main>
      <section className="home-hero">
        <img className="home-hero-bg" src="https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1800&q=82" alt="Pemain olahraga di lapangan" />
        <div className="home-hero-shade" />
        <div className="shell home-hero-content">
          <div className="home-copy">
            <div className="eyebrow light"><Sparkles size={15} /> Booking venue olahraga</div>
            <h1>CourtBook</h1>
            <p>Temukan lapangan, cek slot real-time, kunci jadwal, lalu bayar aman lewat Midtrans dalam satu flow yang singkat.</p>
            <div className="hero-actions">
              <Link className="btn" href="/venues"><Search size={18} /> Cari Lapangan</Link>
              <Link className="btn glass" href="/bookings">Cek Booking <ArrowRight size={18} /></Link>
            </div>
          </div>
          <form className="hero-search-bar" action="/venues">
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
            <button className="btn" type="submit"><Search size={18} /> Cari</button>
          </form>
          <div className="hero-proof">
            <div><strong>{venues.length}</strong><span>Venue aktif</span></div>
            <div><strong>7 hari</strong><span>Cek availability</span></div>
            <div><strong>Midtrans</strong><span>Satu pintu bayar</span></div>
            <div>
              <strong>{featuredVenue?.name || "Arena Senayan"}</strong>
              <span><MapPin size={14} /> {featuredVenue?.location || "Gelora, Jakarta Pusat"} {minPrice > 0 ? `mulai ${formatRupiah(minPrice)}/jam` : ""}</span>
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

      <section className="section">
        <div className="shell">
          <div className="section-title">
            <div>
              <h2>Booking dalam 4 langkah</h2>
              <p className="muted">Flow dibuat pendek agar customer bisa berangkat dari pencarian ke pembayaran dalam sekali sesi.</p>
            </div>
          </div>
          <div className="feature-grid">
            {["Cari venue", "Pilih lapangan", "Kunci slot", "Bayar dan terima QR"].map((step, index) => (
              <div className="metric" key={step}>
                <span className="muted">Langkah {index + 1}</span>
                <strong>{step}</strong>
                {index === 2 && <p className="muted inline-note"><Timer size={15} /> Slot pending otomatis kedaluwarsa.</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
