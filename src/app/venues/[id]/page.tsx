import Link from "next/link";
import { ArrowRight, Clock, MapPin, ShieldCheck, Sparkles, Star, WalletCards } from "lucide-react";
import { getVenue } from "@/lib/db-data";
import { formatRupiah } from "@/lib/format";
import { sportLabels } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) return <main className="shell section">Venue tidak ditemukan.</main>;
  const minPrice = venue.courts.length ? Math.min(...venue.courts.map((court) => court.pricePerHour)) : 0;

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="stack">
          <div className="venue-gallery">
            <div className="detail-hero-wrap">
              <img className="detail-hero" src={venue.photos[0]} alt={venue.name} />
              <div className="detail-hero-overlay">
                <div>
                  <div className="eyebrow"><Sparkles size={15} /> Super venue</div>
                  <h1>{venue.name}</h1>
                  <p><MapPin size={17} /> {venue.location}</p>
                </div>
                <div className="price-tile">
                  <span>Mulai</span>
                  <strong>{minPrice ? `${formatRupiah(minPrice)}/jam` : "Hubungi venue"}</strong>
                </div>
              </div>
            </div>
            <div className="gallery-strip">
              {venue.photos.slice(1, 4).map((photo, index) => (
                <img src={photo} alt={`${venue.name} ${index + 2}`} key={photo} />
              ))}
            </div>
          </div>
          <div className="panel stack">
            <p>{venue.description}</p>
            <div className="feature-grid">
              <div className="metric"><span className="muted">Rating</span><strong>{venue.rating}</strong></div>
              <div className="metric"><span className="muted">Buka</span><strong>{venue.opensAt}</strong></div>
              <div className="metric"><span className="muted">Tutup</span><strong>{venue.closesAt}</strong></div>
            </div>
            <div className="chips">
              {venue.facilities.map((item) => <span className="chip strong" key={item}>{item}</span>)}
            </div>
          </div>
          <div className="panel">
            <h2>Aturan Booking</h2>
            {venue.rules.map((rule) => <div className="row" key={rule}><span>{rule}</span></div>)}
            <p className="notice muted"><ShieldCheck size={18} /> {venue.cancellationPolicy}</p>
          </div>
        </div>
        <aside className="panel stack booking-summary">
          <div className="row"><span className="inline"><Star size={16} /> Rating</span><strong>{venue.rating}</strong></div>
          <div className="row"><span className="inline"><Clock size={16} /> Operasional</span><strong>{venue.opensAt} - {venue.closesAt}</strong></div>
          <div className="notice muted"><WalletCards size={18} /> Pembayaran online tersedia saat checkout.</div>
          <h2>Pilih Lapangan</h2>
          {venue.courts.map((court) => (
            <div className="court-card stack" key={court.id}>
              <div>
                <strong>{court.name}</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>{sportLabels[court.sportType]} / {court.surface}</p>
              </div>
              <div className="row"><span>Harga per jam</span><strong>{formatRupiah(court.pricePerHour)}</strong></div>
              <Link className="btn full" href={`/checkout?courtId=${court.id}`}>Cek Availability <ArrowRight size={17} /></Link>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
