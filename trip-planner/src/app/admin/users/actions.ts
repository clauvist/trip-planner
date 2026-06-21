"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { createInvite } from "@/lib/invite";
import { hashPassword, validatePasswordComplexity } from "@/lib/password";
import { validateEmail, validateUsername } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export interface AdminFormState {
  error?: string;
  inviteUrl?: string;
}

export async function createPlatformInvite(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "ADMIN" ? Role.ADMIN : Role.USER;
  const tripIds = formData.getAll("tripIds").map(String);

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const { token } = await createInvite({ email, role, tripIds, createdById: admin.id });
  revalidatePath("/admin/users");
  return { inviteUrl: `/signup/${token}` };
}

export async function updateUser(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "ADMIN" ? Role.ADMIN : Role.USER;

  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const emailError = validateEmail(email);
  if (emailError) throw new Error(emailError);

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== userId) throw new Error("Another account already uses this email.");
  const usernameOwner = await prisma.user.findUnique({ where: { username } });
  if (usernameOwner && usernameOwner.id !== userId) throw new Error("Another account already uses this username.");

  if (role === Role.USER) {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (current.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) throw new Error("Cannot demote the last remaining admin.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { username, email, role } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) throw new Error("Cannot delete the last remaining admin.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/users");
}

export async function grantTripAccess(userId: string, tripId: string): Promise<void> {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const count = await tx.tripMember.count({ where: { tripId } });
    await tx.tripMember.upsert({
      where: { tripId_userId: { tripId, userId } },
      update: {},
      create: { tripId, userId, hue: (count * 67) % 360, order: count },
    });
  });
  revalidatePath("/admin/users");
}

export async function revokeTripAccess(userId: string, tripId: string): Promise<void> {
  await requireAdmin();
  await prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  revalidatePath("/admin/users");
}
