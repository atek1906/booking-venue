import { AdminShell } from "@/components/AdminShell";
import { formatRupiah } from "@/lib/format";
import { listVenues } from "@/lib/db-data";
import { sportLabels } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function AdminCourtsPage() {
  const venues = await listVenues();
  const courts = venues.flatMap((venue) => venue.courts.map((court) => ({ ...court, venueName: venue.name })));
  return (
    <AdminShell>
      <div className="section-title"><h2>Manajemen Lapangan</h2><button className="btn">Tambah Lapangan</button></div>
      <table className="table">
        <thead><tr><th>Venue</th><th>Lapangan</th><th>Jenis</th><th>Permukaan</th><th>Harga/jam</th><th>Aksi</th></tr></thead>
        <tbody>
          {courts.map((court) => (
            <tr key={court.id}>
              <td>{court.venueName}</td><td>{court.name}</td><td>{sportLabels[court.sportType]}</td><td>{court.surface}</td><td>{formatRupiah(court.pricePerHour)}</td><td>Edit harga</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
