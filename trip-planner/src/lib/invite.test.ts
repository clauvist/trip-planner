import { describe, expect, it } from "vitest";
import { isInviteUsable, generateInviteToken } from "./invite";

describe("isInviteUsable", () => {
  const now = new Date("2026-06-20T00:00:00Z");

  it("returns true for an unused, unexpired invite", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: new Date("2026-06-21T00:00:00Z") }, now)).toBe(true);
  });

  it("returns false for a used invite", () => {
    expect(
      isInviteUsable({ usedAt: new Date("2026-06-19T00:00:00Z"), expiresAt: new Date("2026-06-21T00:00:00Z") }, now)
    ).toBe(false);
  });

  it("returns false for an expired invite", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: new Date("2026-06-19T00:00:00Z") }, now)).toBe(false);
  });

  it("returns false when expiry equals now", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: now }, now)).toBe(false);
  });
});

describe("generateInviteToken", () => {
  it("generates a non-empty, URL-safe token", () => {
    const token = generateInviteToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct tokens on each call", () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });
});
