import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteRecord {
  usedAt: Date | null;
  expiresAt: Date;
}

export function isInviteUsable(invite: InviteRecord, now: Date = new Date()): boolean {
  if (invite.usedAt !== null) return false;
  return invite.expiresAt.getTime() > now.getTime();
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createInvite(params: {
  email: string;
  role: Role;
  tripIds: string[];
  createdById: string;
}): Promise<{ token: string }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
  await prisma.invite.create({
    data: {
      token,
      email: params.email,
      role: params.role,
      tripIds: params.tripIds,
      expiresAt,
      createdById: params.createdById,
    },
  });
  return { token };
}

export async function findInviteByToken(token: string) {
  return prisma.invite.findUnique({ where: { token } });
}
