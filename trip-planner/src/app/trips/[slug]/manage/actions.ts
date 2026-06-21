"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTripLeader } from "@/lib/dal";
import { createInvite } from "@/lib/invite";
import { Role, TripRole } from "@/generated/prisma/client";
import { validateEmail } from "@/lib/validation";

export interface TripInviteFormState {
  error?: string;
  inviteUrl?: string;
}

export async function createTripInvite(
  tripId: string,
  _prevState: TripInviteFormState,
  formData: FormData
): Promise<TripInviteFormState> {
  const { user } = await requireTripLeader(tripId);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const { token } = await createInvite({ email, role: Role.USER, tripIds: [tripId], createdById: user.id });
  revalidatePath("/trips");
  return { inviteUrl: `/signup/${token}` };
}

export async function removeTripMember(tripId: string, userId: string): Promise<void> {
  await requireTripLeader(tripId);
  await prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  revalidatePath("/trips");
}

export async function setTripMemberRole(tripId: string, userId: string, tripRole: TripRole): Promise<void> {
  await requireTripLeader(tripId);
  await prisma.tripMember.update({ where: { tripId_userId: { tripId, userId } }, data: { tripRole } });
  revalidatePath("/trips");
}

export async function updateTripDetails(tripId: string, formData: FormData): Promise<void> {
  await requireTripLeader(tripId);
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  if (!name || !startDate) throw new Error("Name and start date are required.");

  await prisma.trip.update({ where: { id: tripId }, data: { name, startDate: new Date(startDate) } });
  revalidatePath("/trips");
}
