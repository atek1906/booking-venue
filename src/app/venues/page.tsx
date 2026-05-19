import { VenueCard } from "@/components/VenueCard";
import { listVenues } from "@/lib/db-data";
import { sportLabels } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function VenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const sport = params.sport;
  const location = params.location?.toLowerCase();
  const maxPrice = Number(params.maxPrice || 0);
  const filtered = await listVenues({ sport, location, maxPrice });

  return (
    <main className="section compact">
      <div className="shell stack">
        <div className="section-title">
          <div>
            <div className="eyebrow">Venue tersedia</div>
            <h1>Daftar venue</h1>
            <p className="muted">{filtered.length} venue cocok untuk filter saat ini. Persempit dengan olahraga, lokasi, atau batas harga.</p>
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
            <input name="maxPrice" defaultValue={params.maxPrice || ""} inputMode="numeric" placeholder="300000" />
          </div>
          <button className="btn">Terapkan</button>
        </form>
        {filtered.length ? (
          <div className="grid">
            {filtered.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
          </div>
        ) : (
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>Belum ada venue yang cocok</h2>
            <p className="muted" style={{ margin: 0 }}>Coba kosongkan lokasi atau naikkan harga maksimal.</p>
          </div>
        )}
      </div>
    </main>
  );
}
