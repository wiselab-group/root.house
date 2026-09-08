import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./token";

describe("generateToken", () => {
  it("returns a base64url plaintext token and its matching SHA-256 hash", () => {
    const { token, tokenHash } = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never produces the same token twice across calls", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("same-input")).toBe(hashToken("same-input"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("input-a")).not.toBe(hashToken("input-b"));
  });
});
