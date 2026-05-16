import { VenueCard } from "@/components/VenueCard";
import { sportLabels, venues } from "@/lib/mock-data";

export default async function VenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const sport = params.sport;
  const location = params.location?.toLowerCase();
  const maxPrice = Number(params.maxPrice || 0);
  const filtered = venues.filter((venue) => {
    const sportMatch = !sport || venue.courts.some((court) => court.sportType === sport);
    const locationMatch = !location || `${venue.city} ${venue.location}`.toLowerCase().includes(location);
    const priceMatch = !maxPrice || venue.courts.some((court) => court.pricePerHour <= maxPrice);
    return sportMatch && locationMatch && priceMatch;
  });

  return (
    <main className="section">
      <div className="shell stack">
        <div className="section-title">
          <div>
            <h2>Daftar Venue</h2>
            <p className="muted">Filter berdasarkan olahraga, lokasi, tanggal, harga, dan ketersediaan.</p>
          </div>
        </div>
        <form className="search-panel" action="/venues">
          <div className="field">
            <label>Olahraga</label>
            <select name="sport" defaultValue={sport || ""}>
              <option value="">Semua</option>
              {Object.entries(sportLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Lokasi</label>
            <input name="location" defaultValue={params.location || ""} placeholder="Kota atau area" />
          </div>
          <div className="field">
            <label>Harga maksimal</label>
            <input name="maxPrice" defaultValue={params.maxPrice || ""} placeholder="300000" />
          </div>
          <button className="btn">Terapkan</button>
        </form>
        <div className="grid">
          {filtered.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </div>
      </div>
    </main>
  );
}
