import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { families, familyRoleEnum } from "./family";
import { users } from "./auth";

/**
 * FamilyInvitation — an owner-issued invite for someone (by email) to join a
 * Family at a given role. The plaintext token is NEVER stored — only its
 * SHA-256 hash (tokenHash), so a DB leak can't be used to accept invitations
 * (same reasoning as password hashing). The plaintext token exists only in
 * the URL sent to the invitee (and shown once in the UI as a copyable link).
 *
 * Status is derived, not a separate enum column: acceptedAt/revokedAt/expiresAt
 * together fully describe state (pending / accepted / revoked / expired) —
 * see domain/invitation/invitation.service.ts::invitationStatus for the
 * single place that interprets these three columns.
 *
 * Resend is modeled as "revoke the old row, insert a new row" — there is no
 * supersededBy linkage; the pending-invitations query stays a flat filter.
 */
export const familyInvitations = pgTable(
  "family_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: familyRoleEnum("role").notNull().default("viewer"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("family_invitations_token_hash_unique").on(table.tokenHash),
    index("family_invitations_family_idx").on(table.familyId),
    index("family_invitations_family_email_idx").on(
      table.familyId,
      table.email,
    ),
  ],
);
