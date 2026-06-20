import { describe, expect, it } from "vitest";
import { validateUsername, validateEmail } from "./validation";

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("Tristan_1")).toBeNull();
  });

  it("rejects a username under 3 characters", () => {
    expect(validateUsername("ab")).toMatch(/3-30/);
  });

  it("rejects a username over 30 characters", () => {
    expect(validateUsername("a".repeat(31))).toMatch(/3-30/);
  });

  it("rejects a username with invalid characters", () => {
    expect(validateUsername("bad name!")).toMatch(/letters, numbers/);
  });
});

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("person@example.com")).toBeNull();
  });

  it("rejects a missing @", () => {
    expect(validateEmail("personexample.com")).toMatch(/valid email/);
  });

  it("rejects a missing domain", () => {
    expect(validateEmail("person@")).toMatch(/valid email/);
  });
});
