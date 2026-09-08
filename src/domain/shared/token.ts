import crypto from "node:crypto";

/**
 * Shared by invitation.service.ts and share-link.service.ts — both need a
 * cryptographically random, URL-safe, one-time-shown plaintext token whose
 * only persisted form is a SHA-256 hash (never the plaintext), so a DB leak
 * alone can never be used to redeem either. Extracted here rather than left
 * as two independent inline copies, per the project's convention against
 * building parallel mechanisms for the same concern.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
