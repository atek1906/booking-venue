import Link from "next/link";
import { ArrowRight, Clock, MapPin, Star, Trophy } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { sportLabels } from "@/lib/mock-data";
import type { Venue } from "@/lib/types";

export function VenueCard({ venue }: { venue: Venue }) {
  const sports = Array.from(new Set(venue.courts.map((court) => court.sportType)));
  const minPrice = venue.courts.length ? Math.min(...venue.courts.map((court) => court.pricePerHour)) : 0;

  return (
    <article className="card">
      <div className="venue-media">
        <img className="venue-img" src={venue.photos[0]} alt={venue.name} />
        <div className="venue-badge"><Star size={14} /> {venue.rating}</div>
      </div>
      <div className="card-body stack">
        <div>
          <h3 className="card-title">{venue.name}</h3>
          <div className="card-meta">
            <MapPin size={16} /> {venue.location}
          </div>
        </div>
        <div className="chips">
          {sports.slice(0, 3).map((sport) => (
            <span className="chip" key={sport}>{sportLabels[sport]}</span>
          ))}
          {sports.length > 3 && <span className="chip">+{sports.length - 3}</span>}
        </div>
        <div className="row">
          <span className="inline"><Trophy size={15} /> {venue.courts.length} lapangan</span>
          <span className="inline"><Clock size={15} /> {venue.opensAt}-{venue.closesAt}</span>
        </div>
        <div className="row">
          <span>Mulai</span>
          <strong>{minPrice ? `${formatRupiah(minPrice)}/jam` : "Hubungi venue"}</strong>
        </div>
        <Link className="btn full" href={`/venues/${venue.slug}`}>Lihat Detail <ArrowRight size={17} /></Link>
      </div>
    </article>
  );
}
