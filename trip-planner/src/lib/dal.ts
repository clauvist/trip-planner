import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isSessionExpired } from "@/lib/session";
import { isAdmin, canLeadTrip, hasTripAccess, type AuthUser } from "@/lib/permissions";

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || isSessionExpired(session.expiresAt)) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    role: session.user.role,
  };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/trips");
  return user;
}

export async function getTripMembership(userId: string, tripId: string) {
  return prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
}

export async function requireTripAccess(tripId: string) {
  const user = await requireUser();
  const membership = await getTripMembership(user.id, tripId);
  if (!hasTripAccess(membership)) redirect("/trips");
  return { user, membership: membership! };
}

export async function requireTripLeader(tripId: string) {
  const user = await requireUser();
  const membership = await getTripMembership(user.id, tripId);
  if (!canLeadTrip(user, membership)) redirect("/trips");
  return { user, membership };
}
