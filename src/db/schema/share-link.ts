import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { users } from "./auth";

/**
 * Scope of what a ShareLink exposes. FAMILY (the only value used today)
 * means "the whole family's PUBLIC-privacy subset, anchored at focusPersonId".
 * PERSON/BRANCH/STORY are reserved for a future narrower scope — scopeId
 * stays nullable and unused until one of those ships; adding a value here is
 * a pure enum-append migration, no column rework.
 */
export const shareLinkScopeTypeEnum = pgEnum("share_link_scope_type", [
  "FAMILY",
  "PERSON",
  "BRANCH",
  "STORY",
]);

/** Only VIEW_ONLY implemented. Enum (not boolean) so a future edit-ish
 *  permission is an enum-append, not a column-type change. */
export const shareLinkPermissionEnum = pgEnum("share_link_permission", [
  "VIEW_ONLY",
]);

/**
 * Per-link choice of how far into the privacy spectrum this ONE link
 * reaches — an owner with hundreds of Persons, virtually all left at the
 * "family" default, would otherwise have to hand-mark each one "public"
 * before any Share Link showed anything at all. This does NOT change any
 * Person/Event/Media/Story's own privacyLevel or the family-side canView
 * rule — it only widens what THIS SPECIFIC anonymous link is allowed to
 * surface, decided explicitly by the owner at creation time:
 *   - "public_only": strictly privacyLevel="public" objects (the narrowest,
 *     original behavior).
 *   - "family_and_public": privacyLevel="family" OR "public" — i.e.
 *     everything an ordinary authenticated viewer role would see. "private"
 *     is NEVER included by either value — that barrier is not configurable
 *     per-link, on purpose (see public-visibility.ts).
 * See public-visibility.ts::canViewViaShareLink, which takes this value as
 * a parameter rather than hardcoding "public_only" everywhere.
 */
export const shareLinkVisibilityScopeEnum = pgEnum(
  "share_link_visibility_scope",
  ["public_only", "family_and_public"],
);

/**
 * ShareLink — an owner-issued, tokenized, anonymous, read-only access link
 * to a Family's PUBLIC-privacy content. Deliberately NOT a FamilyMember/
 * User/Invitation: the holder gets no account, no Auth.js session, no row
 * in family_members. See domain/share-link/public-visibility.ts for the
 * effective-visibility rule (canViewViaShareLink) that governs what a
 * holder actually sees — strictly narrower than any authenticated role
 * (which treats "family" and "public" identically).
 *
 * Same token-security pattern as family_invitations: the plaintext token is
 * NEVER persisted, only its SHA-256 hash (tokenHash), unique-indexed. Status
 * (active/expired/revoked) is derived from expiresAt/revokedAt, not stored —
 * see share-link.service.ts::shareLinkStatus, mirrors
 * invitation.service.ts::invitationStatus.
 *
 * scopeId is nullable and UNUSED for scopeType "FAMILY" — reserved for a
 * future PERSON/BRANCH/STORY scope to point at the specific row. Left
 * without an FK constraint on purpose: it may need to reference different
 * tables depending on scopeType, so a single FK column can't target all of
 * them — same reasoning as persons.photoMediaId's app-enforced (no-FK)
 * pattern.
 *
 * focusPersonId is the owner-chosen anchor for the anonymous tree view —
 * required because the layout engine (src/domain/tree/layout/graph.ts)
 * needs a valid focus person present in the privacy-filtered graph, and
 * public persons in a family may form multiple disconnected clusters (see
 * public-tree.service.ts). No FK for the same reason as scopeId — validated
 * against persons (must exist, belong to this family, and be
 * privacyLevel="public") in the application layer instead.
 *
 * passwordHash uses bcrypt-ts (already a project dependency, see
 * src/domain/auth/auth.service.ts) — never plaintext. NULL means no
 * password required.
 */
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    scopeType: shareLinkScopeTypeEnum("scope_type").notNull().default("FAMILY"),
    // Unused while scopeType = "FAMILY" — see doc comment above.
    scopeId: uuid("scope_id"),
    // Unused for now; required for FAMILY scope in this MVP — see doc comment.
    focusPersonId: uuid("focus_person_id").notNull(),
    permission: shareLinkPermissionEnum("permission")
      .notNull()
      .default("VIEW_ONLY"),
    // Owner's explicit per-link choice — see shareLinkVisibilityScopeEnum's
    // doc comment. Defaults to the wider "family_and_public" (the practical
    // default: requiring public_only would mean most links show nothing at
    // all, since "family" is every object's own default privacyLevel) —
    // "private" objects are excluded either way, unconditionally.
    visibilityScope: shareLinkVisibilityScopeEnum("visibility_scope")
      .notNull()
      .default("family_and_public"),
    passwordHash: text("password_hash"),
    // NULL = never expires.
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("share_links_token_hash_unique").on(table.tokenHash),
    index("share_links_family_idx").on(table.familyId),
  ],
);
