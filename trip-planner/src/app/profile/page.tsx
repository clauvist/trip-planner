import { requireUser } from "@/lib/dal";
import { getTripsForUser } from "@/lib/trip";
import { ProfileForms } from "./profile-forms";

export default async function ProfilePage() {
  const user = await requireUser();
  const trips = await getTripsForUser(user.id);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Your profile</h1>
        <ProfileForms username={user.username} email={user.email} />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Your trips</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {trips.map((trip) => (
              <a
                key={trip.id}
                href={`/trips/${trip.slug}`}
                style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
              >
                {trip.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
