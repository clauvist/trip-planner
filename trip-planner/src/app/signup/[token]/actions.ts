"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findInviteByToken, isInviteUsable } from "@/lib/invite";
import { hashPassword, validatePasswordComplexity } from "@/lib/password";
import { validateUsername } from "@/lib/validation";
import { createSession } from "@/lib/session";

export interface SignupFormState {
  error?: string;
}

export async function redeemInvite(
  token: string,
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const invite = await findInviteByToken(token);
  if (!invite || !isInviteUsable(invite)) {
    return { error: "This invite link is invalid or has expired." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) return { error: passwordError };

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return { error: "That username is already taken." };

  const existingEmail = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingEmail) return { error: "An account with this email already exists." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email: invite.email, passwordHash, role: invite.role },
    });

    for (const tripId of invite.tripIds) {
      const count = await tx.tripMember.count({ where: { tripId } });
      await tx.tripMember.create({
        data: { tripId, userId: created.id, hue: (count * 67) % 360, order: count },
      });
    }

    await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date(), usedById: created.id } });
    return created;
  });

  await createSession(user.id, false);
  redirect("/trips");
}
