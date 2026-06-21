import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getTripsForUser } from "@/lib/trip";
import { TripRole } from "@/generated/prisma/client";

export default async function TripsDashboard() {
  const user = await requireUser();
  const trips = await getTripsForUser(user.id);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Your trips</h1>
        {trips.length === 0 && <p style={{ color: "#6f655b" }}>You don&apos;t have access to any trips yet.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.slug}`}
              style={{
                display: "block",
                background: "#fffdfa",
                border: "1px solid #ece3d8",
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>{trip.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#a09487", marginTop: 4 }}>
                {trip.members[0]?.tripRole === TripRole.LEADER ? "Trip Leader" : "Member"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
