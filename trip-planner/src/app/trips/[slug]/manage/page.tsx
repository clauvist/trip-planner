import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTripLeader } from "@/lib/dal";
import { TripRole } from "@/generated/prisma/client";
import { removeTripMember, setTripMemberRole, updateTripDetails } from "./actions";
import { TripInviteForm } from "./trip-invite-form";

export default async function TripManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({ where: { slug } });
  if (!trip) notFound();

  await requireTripLeader(trip.id);
  const members = await prisma.tripMember.findMany({
    where: { tripId: trip.id },
    orderBy: { order: "asc" },
    include: { user: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Manage &ldquo;{trip.name}&rdquo;</h1>

        <form
          action={updateTripDetails.bind(null, trip.id)}
          style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Trip details</h2>
          <input name="name" defaultValue={trip.name} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
          <input
            name="startDate"
            type="date"
            defaultValue={trip.startDate.toISOString().slice(0, 10)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
          <button
            type="submit"
            style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Save
          </button>
        </form>

        <TripInviteForm tripId={trip.id} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <span style={{ fontWeight: 600 }}>
                {member.user.username} {member.tripRole === TripRole.LEADER ? "— Leader" : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <form
                  action={setTripMemberRole.bind(
                    null,
                    trip.id,
                    member.userId,
                    member.tripRole === TripRole.LEADER ? TripRole.MEMBER : TripRole.LEADER
                  )}
                >
                  <button
                    type="submit"
                    style={{ background: "#ece3d8", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    {member.tripRole === TripRole.LEADER ? "Demote" : "Promote to Leader"}
                  </button>
                </form>
                <form action={removeTripMember.bind(null, trip.id, member.userId)}>
                  <button
                    type="submit"
                    style={{ background: "none", border: "none", color: "#7c2d2d", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
