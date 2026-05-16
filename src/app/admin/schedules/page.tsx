import { AdminShell } from "@/components/AdminShell";
import { unavailableSlots } from "@/lib/mock-data";

export default function AdminSchedulesPage() {
  return (
    <AdminShell>
      <div className="section-title"><h2>Manajemen Jadwal</h2><button className="btn">Block Slot Manual</button></div>
      <div className="panel stack">
        <h3>Slot Unavailable</h3>
        {unavailableSlots.map((slot) => (
          <div className="row" key={`${slot.courtId}-${slot.startsAt}`}>
            <span>{slot.courtId}</span>
            <strong>{new Date(slot.startsAt).toLocaleString("id-ID")} - {new Date(slot.endsAt).toLocaleTimeString("id-ID")}</strong>
            <span className="muted">{slot.reason}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
