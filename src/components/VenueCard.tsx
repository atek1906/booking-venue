import Link from "next/link";
import { ArrowRight, Clock, MapPin, Star } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { sportLabels } from "@/lib/mock-data";
import type { Venue } from "@/lib/types";

export function VenueCard({ venue }: { venue: Venue }) {
  const minPrice = Math.min(...venue.courts.map((court) => court.pricePerHour));

  return (
    <article className="card">
      <img className="venue-img" src={venue.photos[0]} alt={venue.name} />
      <div className="card-body stack">
        <div>
          <h3 style={{ margin: "0 0 8px" }}>{venue.name}</h3>
          <div className="card-meta">
            <MapPin size={16} /> {venue.location}
          </div>
        </div>
        <div className="chips">
          {Array.from(new Set(venue.courts.map((court) => court.sportType))).map((sport) => (
            <span className="chip" key={sport}>{sportLabels[sport]}</span>
          ))}
        </div>
        <div className="row">
          <span className="inline"><Star size={15} /> {venue.rating}</span>
          <span className="inline"><Clock size={15} /> {venue.opensAt}-{venue.closesAt}</span>
        </div>
        <div className="row">
          <span>Mulai</span>
          <strong>{formatRupiah(minPrice)}/jam</strong>
        </div>
        <Link className="btn full" href={`/venues/${venue.slug}`}>Lihat Detail <ArrowRight size={17} /></Link>
      </div>
    </article>
  );
}
