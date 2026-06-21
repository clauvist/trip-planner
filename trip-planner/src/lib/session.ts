import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_MS = 24 * 60 * 60 * 1000;

export function sessionDurationMs(remember: boolean): number {
  return remember ? REMEMBER_ME_MS : DEFAULT_SESSION_MS;
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, remember: boolean): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + sessionDurationMs(remember));
  await prisma.session.create({ data: { token, userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: Math.floor(REMEMBER_ME_MS / 1000) } : {}),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
