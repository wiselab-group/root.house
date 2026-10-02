import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Read-only service metrics for /admin. PRIVACY BOUNDARY (published in
 * /privacy, § "Who sees your archive"): these queries may return only
 * emails, dates, counts and byte sizes — never names of people, families,
 * stories, captions, file URLs or any other archive content. A family is
 * identified by its owners' emails, not its name. Widening this is a
 * privacy-policy change first, a code change second.
 *
 * Deliberately not family-scoped (unlike every other repository): callers
 * must have passed requireAdmin() — see lib/admin-guard.ts.
 */

export type AdminSummary = {
  users: number;
  newUsers7d: number;
  active7d: number;
  active30d: number;
  families: number;
  persons: number;
  stories: number;
  mediaFiles: number;
  storageBytes: number;
};

export async function getAdminSummary(): Promise<AdminSummary> {
  const result = await db.execute<Record<keyof AdminSummary, string>>(sql`
    SELECT
      (SELECT count(*) FROM users) AS "users",
      (SELECT count(*) FROM users
        WHERE created_at > now() - interval '7 days') AS "newUsers7d",
      (SELECT count(DISTINCT actor_id) FROM activity_log
        WHERE created_at > now() - interval '7 days') AS "active7d",
      (SELECT count(DISTINCT actor_id) FROM activity_log
        WHERE created_at > now() - interval '30 days') AS "active30d",
      (SELECT count(*) FROM families) AS "families",
      (SELECT count(*) FROM persons) AS "persons",
      (SELECT count(*) FROM stories) AS "stories",
      (SELECT count(*) FROM media) AS "mediaFiles",
      (SELECT coalesce(sum(size_bytes), 0) FROM media) AS "storageBytes"
  `);
  // Postgres count/sum come back as strings (bigint) over neon-http.
  const row = result.rows[0];
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)]),
  ) as AdminSummary;
}

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: Date;
  lastSignInAt: Date | null;
  lastActivityAt: Date | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  families: number;
};

export async function listAdminUsers(limit = 500): Promise<AdminUserRow[]> {
  const result = await db.execute<{
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    last_activity_at: string | null;
    has_password: boolean;
    has_google: boolean;
    families: string;
  }>(sql`
    SELECT
      u.id, u.email, u.created_at, u.last_sign_in_at,
      (SELECT max(al.created_at) FROM activity_log al
        WHERE al.actor_id = u.id) AS last_activity_at,
      u.password_hash IS NOT NULL AS has_password,
      EXISTS (SELECT 1 FROM accounts a
        WHERE a.user_id = u.id AND a.provider = 'google') AS has_google,
      (SELECT count(*) FROM family_members fm
        WHERE fm.user_id = u.id) AS families
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT ${limit}
  `);
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at),
    lastSignInAt: row.last_sign_in_at ? new Date(row.last_sign_in_at) : null,
    lastActivityAt: row.last_activity_at
      ? new Date(row.last_activity_at)
      : null,
    hasPassword: row.has_password,
    hasGoogle: row.has_google,
    families: Number(row.families),
  }));
}

export type AdminFamilyRow = {
  id: string;
  ownerEmails: string[];
  createdAt: Date;
  members: number;
  persons: number;
  stories: number;
  mediaFiles: number;
  storageBytes: number;
  lastActivityAt: Date | null;
};

/** Heaviest storage first — that's the row that costs money. */
export async function listAdminFamilies(
  limit = 500,
): Promise<AdminFamilyRow[]> {
  const result = await db.execute<{
    id: string;
    owner_emails: string[] | null;
    created_at: string;
    members: string;
    persons: string;
    stories: string;
    media_files: string;
    storage_bytes: string;
    last_activity_at: string | null;
  }>(sql`
    SELECT
      f.id, f.created_at,
      (SELECT array_agg(u.email ORDER BY u.email)
        FROM family_members fm JOIN users u ON u.id = fm.user_id
        WHERE fm.family_id = f.id AND fm.role = 'owner') AS owner_emails,
      (SELECT count(*) FROM family_members fm
        WHERE fm.family_id = f.id) AS members,
      (SELECT count(*) FROM persons p WHERE p.family_id = f.id) AS persons,
      (SELECT count(*) FROM stories s WHERE s.family_id = f.id) AS stories,
      m.files AS media_files,
      m.bytes AS storage_bytes,
      (SELECT max(al.created_at) FROM activity_log al
        WHERE al.family_id = f.id) AS last_activity_at
    FROM families f
    CROSS JOIN LATERAL (
      SELECT count(*) AS files, coalesce(sum(size_bytes), 0) AS bytes
      FROM media WHERE media.family_id = f.id
    ) m
    ORDER BY m.bytes DESC, f.created_at DESC
    LIMIT ${limit}
  `);
  return result.rows.map((row) => ({
    id: row.id,
    ownerEmails: row.owner_emails ?? [],
    createdAt: new Date(row.created_at),
    members: Number(row.members),
    persons: Number(row.persons),
    stories: Number(row.stories),
    mediaFiles: Number(row.media_files),
    storageBytes: Number(row.storage_bytes),
    lastActivityAt: row.last_activity_at
      ? new Date(row.last_activity_at)
      : null,
  }));
}
