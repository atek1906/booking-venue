import Link from "next/link";
import { Clock, MapPin, Star } from "lucide-react";
import { formatRupiah } from "@/lib/booking";
import { sportLabels, venues } from "@/lib/mock-data";

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = venues.find((item) => item.slug === id || item.id === id);
  if (!venue) return <main className="shell section">Venue tidak ditemukan.</main>;

  return (
    <main className="section">
      <div className="shell detail-layout">
        <div className="stack">
          <img className="detail-hero" src={venue.photos[0]} alt={venue.name} />
          <div className="panel stack">
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: 42 }}>{venue.name}</h1>
              <p className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}><MapPin size={18} /> {venue.location}</p>
            </div>
            <p>{venue.description}</p>
            <div className="chips">{venue.facilities.map((item) => <span className="chip" key={item}>{item}</span>)}</div>
          </div>
          <div className="panel">
            <h2>Aturan Booking</h2>
            {venue.rules.map((rule) => <div className="row" key={rule}><span>{rule}</span></div>)}
            <p className="muted">{venue.cancellationPolicy}</p>
          </div>
        </div>
        <aside className="panel stack">
          <div className="row"><span><Star size={16} /> Rating</span><strong>{venue.rating}</strong></div>
          <div className="row"><span><Clock size={16} /> Operasional</span><strong>{venue.opensAt} - {venue.closesAt}</strong></div>
          <h2>Pilih Lapangan</h2>
          {venue.courts.map((court) => (
            <div className="panel stack" style={{ boxShadow: "none" }} key={court.id}>
              <div>
                <strong>{court.name}</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>{sportLabels[court.sportType]} · {court.surface}</p>
              </div>
              <div className="row"><span>Harga per jam</span><strong>{formatRupiah(court.pricePerHour)}</strong></div>
              <Link className="btn" href={`/checkout?courtId=${court.id}`}>Pilih Jadwal</Link>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
