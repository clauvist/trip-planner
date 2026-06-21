import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { InviteForm } from "./invite-form";
import { updateUser, deleteUser, resetUserPassword, grantTripAccess, revokeTripAccess } from "./actions";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: { tripAccess: { include: { trip: true } } },
  });
  const trips = await prisma.trip.findMany({ orderBy: { name: "asc" } });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Manage users</h1>

        <InviteForm trips={trips} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {users.map((user) => {
            const accessTripIds = new Set(user.tripAccess.map((a) => a.tripId));
            return (
              <div key={user.id} style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20 }}>
                <form action={updateUser.bind(null, user.id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input name="username" defaultValue={user.username} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <input name="email" defaultValue={user.email} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <select name="role" defaultValue={user.role} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }}>
                    <option value={Role.USER}>User</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                  <button
                    type="submit"
                    style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Save
                  </button>
                </form>
                <form action={resetUserPassword.bind(null, user.id)} style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input name="password" type="password" placeholder="New password" style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <button
                    type="submit"
                    style={{ background: "#ece3d8", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Reset password
                  </button>
                </form>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  {trips.map((trip) => {
                    const has = accessTripIds.has(trip.id);
                    const action = has ? revokeTripAccess : grantTripAccess;
                    return (
                      <form key={trip.id} action={action.bind(null, user.id, trip.id)}>
                        <button
                          type="submit"
                          style={{
                            background: has ? "#7c2d2d" : "#ece3d8",
                            color: has ? "#fff" : "#5f554c",
                            border: "none",
                            borderRadius: 999,
                            padding: "4px 12px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {trip.name}
                        </button>
                      </form>
                    );
                  })}
                </div>
                <form action={deleteUser.bind(null, user.id)} style={{ marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={user.id === admin.id}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7c2d2d",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: user.id === admin.id ? "default" : "pointer",
                      opacity: user.id === admin.id ? 0.4 : 1,
                    }}
                  >
                    Remove user
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
