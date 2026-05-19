import { AdminShell } from "@/components/AdminShell";
import { listVenues } from "@/lib/db-data";

export const dynamic = "force-dynamic";

export default async function AdminVenuesPage() {
  const venues = await listVenues();
  return (
    <AdminShell>
      <div className="section-title"><h2>Manajemen Venue</h2><button className="btn">Tambah Venue</button></div>
      <table className="table">
        <thead><tr><th>Venue</th><th>Lokasi</th><th>Jam</th><th>Fasilitas</th><th>Aksi</th></tr></thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id}>
              <td>{venue.name}</td><td>{venue.location}</td><td>{venue.opensAt} - {venue.closesAt}</td><td>{venue.facilities.length} item</td><td>Edit · Hapus</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
