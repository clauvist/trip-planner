"use client";

import { useActionState } from "react";
import { createTripInvite, type TripInviteFormState } from "./actions";

const initialState: TripInviteFormState = {};

export function TripInviteForm({ tripId }: { tripId: string }) {
  const action = createTripInvite.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Invite someone to this trip</h2>
      <input name="email" type="email" placeholder="Email" required style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
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
