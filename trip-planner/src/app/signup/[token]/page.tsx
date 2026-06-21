import { findInviteByToken, isInviteUsable } from "@/lib/invite";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInviteByToken(token);

  if (!invite || !isInviteUsable(invite)) {
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
        <p style={{ maxWidth: 360, textAlign: "center", color: "#5f554c" }}>
          This invite link is invalid or has expired — ask your admin for a new one.
        </p>
      </div>
    );
  }

  return <SignupForm token={token} email={invite.email} />;
}
