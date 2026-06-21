import { describe, expect, it } from "vitest";
import { Role, TripRole } from "@/generated/prisma/client";
import { isAdmin, canLeadTrip, hasTripAccess, type AuthUser } from "./permissions";

function user(role: Role): AuthUser {
  return { id: "u1", username: "test", email: "test@example.com", role };
}

describe("isAdmin", () => {
  it("returns true for an admin", () => {
    expect(isAdmin(user(Role.ADMIN))).toBe(true);
  });

  it("returns false for a regular user", () => {
    expect(isAdmin(user(Role.USER))).toBe(false);
  });
});

describe("canLeadTrip", () => {
  it("returns true for an admin even with no membership", () => {
    expect(canLeadTrip(user(Role.ADMIN), null)).toBe(true);
  });

  it("returns true for a user whose membership is LEADER", () => {
    expect(canLeadTrip(user(Role.USER), { tripRole: TripRole.LEADER })).toBe(true);
  });

  it("returns false for a user whose membership is MEMBER", () => {
    expect(canLeadTrip(user(Role.USER), { tripRole: TripRole.MEMBER })).toBe(false);
  });

  it("returns false for a user with no membership", () => {
    expect(canLeadTrip(user(Role.USER), null)).toBe(false);
  });
});

describe("hasTripAccess", () => {
  it("returns true when a membership exists", () => {
    expect(hasTripAccess({ tripRole: TripRole.MEMBER })).toBe(true);
  });

  it("returns false when membership is null", () => {
    expect(hasTripAccess(null)).toBe(false);
  });
});
