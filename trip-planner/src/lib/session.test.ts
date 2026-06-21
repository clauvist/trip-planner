import { describe, expect, it } from "vitest";
import { sessionDurationMs, isSessionExpired, generateSessionToken } from "./session";

describe("sessionDurationMs", () => {
  it("returns 24 hours when not remembered", () => {
    expect(sessionDurationMs(false)).toBe(24 * 60 * 60 * 1000);
  });

  it("returns 30 days when remembered", () => {
    expect(sessionDurationMs(true)).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("isSessionExpired", () => {
  it("returns false for a future expiry", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    const expiresAt = new Date("2026-06-21T00:00:00Z");
    expect(isSessionExpired(expiresAt, now)).toBe(false);
  });

  it("returns true for a past expiry", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    const expiresAt = new Date("2026-06-19T00:00:00Z");
    expect(isSessionExpired(expiresAt, now)).toBe(true);
  });

  it("returns true when expiry equals now", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(isSessionExpired(now, now)).toBe(true);
  });
});

describe("generateSessionToken", () => {
  it("generates a non-empty, URL-safe token", () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct tokens on each call", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});
