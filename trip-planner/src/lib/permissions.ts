import { Role, TripRole } from "@/generated/prisma/client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

export interface TripMembership {
  tripRole: TripRole;
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === Role.ADMIN;
}

export function canLeadTrip(user: AuthUser, membership: TripMembership | null): boolean {
  if (isAdmin(user)) return true;
  return membership?.tripRole === TripRole.LEADER;
}

export function hasTripAccess(membership: TripMembership | null): boolean {
  return membership !== null;
}
