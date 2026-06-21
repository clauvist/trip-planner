"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "@/lib/password";
import { validateUsername, validateEmail } from "@/lib/validation";

export interface ProfileFormState {
  error?: string;
  success?: string;
}

export async function updateProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== user.id) return { error: "Another account already uses this email." };
  const usernameOwner = await prisma.user.findUnique({ where: { username } });
  if (usernameOwner && usernameOwner.id !== user.id) return { error: "Another account already uses this username." };

  await prisma.user.update({ where: { id: user.id }, data: { username, email } });
  revalidatePath("/profile");
  return { success: "Profile updated." };
}

export async function changePassword(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  const passwordError = validatePasswordComplexity(newPassword);
  if (passwordError) return { error: passwordError };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: "Password changed." };
}
