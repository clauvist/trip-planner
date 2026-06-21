"use client";

import { useActionState } from "react";
import { updateProfile, changePassword, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForms({ username, email }: { username: string; email: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);

  return (
    <>
      <form
        action={profileAction}
        style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Account details</h2>
        <input name="username" defaultValue={username} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <input name="email" type="email" defaultValue={email} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <button
          type="submit"
          disabled={profilePending}
          style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: profilePending ? "default" : "pointer" }}
        >
          Save
        </button>
        {profileState.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{profileState.error}</p>}
        {profileState.success && <p style={{ color: "#3a6b4c", fontSize: 13, margin: 0 }}>{profileState.success}</p>}
      </form>

      <form
        action={passwordAction}
        style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Change password</h2>
        <input name="currentPassword" type="password" placeholder="Current password" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <input name="newPassword" type="password" placeholder="New password" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <button
          type="submit"
          disabled={passwordPending}
          style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: passwordPending ? "default" : "pointer" }}
        >
          Change password
        </button>
        {passwordState.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{passwordState.error}</p>}
        {passwordState.success && <p style={{ color: "#3a6b4c", fontSize: 13, margin: 0 }}>{passwordState.success}</p>}
      </form>
    </>
  );
}
