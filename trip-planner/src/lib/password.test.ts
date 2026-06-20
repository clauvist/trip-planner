import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("Correct1!");
    expect(await verifyPassword("Correct1!", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Correct1!");
    expect(await verifyPassword("WrongPass1!", hash)).toBe(false);
  });
});

describe("validatePasswordComplexity", () => {
  it("accepts a password meeting all rules", () => {
    expect(validatePasswordComplexity("Correct1!")).toBeNull();
  });

  it("rejects a password under 8 characters", () => {
    expect(validatePasswordComplexity("Sh0rt!")).toMatch(/8 characters/);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(validatePasswordComplexity("lowercase1!")).toMatch(/uppercase/);
  });

  it("rejects a password with no lowercase letter", () => {
    expect(validatePasswordComplexity("UPPERCASE1!")).toMatch(/lowercase/);
  });

  it("rejects a password with no number", () => {
    expect(validatePasswordComplexity("NoNumbers!")).toMatch(/number/);
  });

  it("rejects a password with no symbol", () => {
    expect(validatePasswordComplexity("NoSymbols1")).toMatch(/symbol/);
  });
});
