"use client";

import { useActionState } from "react";
import { createPlatformInvite, type AdminFormState } from "./actions";
import { Role } from "@/generated/prisma/browser";

const initialState: AdminFormState = {};

export function InviteForm({ trips }: { trips: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createPlatformInvite, initialState);

  return (
    <form
      action={formAction}
      style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Invite a user</h2>
      <input name="email" type="email" placeholder="Email" required style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
      <select name="role" defaultValue={Role.USER} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}>
        <option value={Role.USER}>User</option>
        <option value={Role.ADMIN}>Admin</option>
      </select>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {trips.map((trip) => (
          <label key={trip.id} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" name="tripIds" value={trip.id} />
            {trip.name}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
      {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
      {state.inviteUrl && (
        <p style={{ fontSize: 13, margin: 0 }}>
          Share this link: <code>{state.inviteUrl}</code>
        </p>
      )}
    </form>
  );
}
