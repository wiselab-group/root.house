import { describe, expect, it } from "vitest";

// buildAlbumsWithCoverQuery goes through the `db` proxy (src/db/client.ts),
// which lazily connects on first property access and throws if
// DATABASE_URL isn't set — but neon-http never actually opens a network
// connection until a query executes, and .toSQL() below only builds SQL
// text. A placeholder connection string (set before the dynamic import
// below, so it's in place the first time db.select() touches the proxy) is
// enough to satisfy the lazy check without ever reaching a real database.
process.env.DATABASE_URL ??=
  "postgres://user:password@localhost/db?sslmode=require";

const { buildAlbumsWithCoverQuery } = await import("./album.repository");

/**
 * Regression coverage for a real bug: interpolating Drizzle Column objects
 * (e.g. ${media.id}) into a correlated subquery nested inside another sql``
 * fragment renders them as a bare, unqualified identifier ("id" instead of
 * "media"."id"). That compiles fine and only fails at query time, once
 * media_album and media (both of which have an `id` column) are joined in
 * the same subquery — Postgres then throws "column reference is ambiguous"
 * (caught live via /families/[slug]/photos once cover photos were added to
 * the album grid). buildAlbumsWithCoverQuery is split out from
 * listAlbumsWithCoverByFamily specifically so this can be asserted on the
 * generated SQL text without needing a live database connection —
 * `.toSQL()` only builds the query, neon-http doesn't open a connection
 * until the query actually executes.
 */
describe("buildAlbumsWithCoverQuery", () => {
  const FAMILY_ID = "11111111-1111-1111-1111-111111111111";

  it("qualifies every ambiguous column with its table name inside each correlated subquery", () => {
    const { sql } = buildAlbumsWithCoverQuery(FAMILY_ID).toSQL();

    // Isolate just the two correlated subqueries — the outer query's own
    // top-level projection (e.g. plain "id" for albums.id) is legitimately
    // unqualified, since `albums` is the only table in its own FROM clause.
    // It's specifically inside these subqueries, where media_album and
    // media are joined together (both have an `id` column), that a bare,
    // unqualified "id" is the exact ambiguity Postgres rejects.
    const subqueryMatches = sql.match(/\(\s*select[\s\S]*?\)\s*as\s*"\w+"/g);
    expect(subqueryMatches).toHaveLength(2);

    for (const subquery of subqueryMatches!) {
      expect(subquery).not.toMatch(/[^."]"id"/);
      // Same ambiguity risk for media_id (present on media_album,
      // media_person, media_place, media_story) and created_at (present on
      // both albums and media) — table-qualifying only "id" while leaving
      // these bare would still compile and still fail the same way.
      expect(subquery).not.toMatch(/[^."]"media_id"/);
      expect(subquery).not.toMatch(/[^."]"created_at"/);
    }
  });

  it("still builds two correlated subqueries scoped to the outer album", () => {
    const { sql } = buildAlbumsWithCoverQuery(FAMILY_ID).toSQL();

    expect(sql).toContain('"photo_count"');
    expect(sql).toContain('"cover_media_id"');
    expect(sql).toContain('"media_album"."album_id" = "albums"."id"');
  });

  it("scopes the avatar-exclusion subquery and the outer query to the given family", () => {
    const { params } = buildAlbumsWithCoverQuery(FAMILY_ID).toSQL();

    // Once for each of the two correlated subqueries' avatar-exclusion
    // filter, plus once for the outer query's own family scope.
    expect(params.filter((p) => p === FAMILY_ID)).toHaveLength(3);
  });
});
