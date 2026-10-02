import { describe, expect, it } from "vitest";
import { isAdminEmail } from "./admin-access";

describe("isAdminEmail", () => {
  it("allows a listed email regardless of case and padding", () => {
    expect(isAdminEmail("thekupczyk@gmail.com")).toBe(true);
    expect(isAdminEmail(" TheKupczyk@Gmail.com ")).toBe(true);
  });

  it("rejects everyone else", () => {
    expect(isAdminEmail("someone@gmail.com")).toBe(false);
    expect(isAdminEmail("thekupczyk@gmail.com.evil.io")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
