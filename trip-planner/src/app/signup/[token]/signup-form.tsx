"use client";

import { useActionState } from "react";
import { redeemInvite, type SignupFormState } from "./actions";

const initialState: SignupFormState = {};

export function SignupForm({ token, email }: { token: string; email: string }) {
  const action = redeemInvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f1ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <form
        action={formAction}
        style={{
          background: "#fffdfa",
          border: "1px solid #ece3d8",
          borderRadius: 14,
          padding: 32,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: "#a09487", margin: 0 }}>{email}</p>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Username
          <input
            name="username"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Password
          <input
            name="password"
            type="password"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#7c2d2d",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
