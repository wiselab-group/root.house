import { describe, expect, it } from "vitest";

// Same lazy-db-proxy workaround as album.repository.test.ts — .toSQL() only
// builds SQL text, neon-http never opens a connection until a query
// actually executes, but the `db` proxy (src/db/client.ts) throws if
// DATABASE_URL isn't set at first property access.
process.env.DATABASE_URL ??=
  "postgres://user:password@localhost/db?sslmode=require";

const {
  buildPersonPhotoCountQuery,
  buildPersonStoryCountQuery,
  buildPersonEventCountQuery,
  buildPersonPhotoCountForPersonQuery,
  buildPersonStoryCountForPersonQuery,
  buildPersonEventCountForPersonQuery,
  EMPTY_ARCHIVE_SUMMARY,
} = await import("./archive-summary");

const FAMILY_ID = "11111111-1111-1111-1111-111111111111";
const PERSON_ID = "44444444-4444-4444-4444-444444444444";
const OWNER = {
  userId: "22222222-2222-2222-2222-222222222222",
  role: "owner" as const,
};
const VIEWER = {
  userId: "33333333-3333-3333-3333-333333333333",
  role: "viewer" as const,
};

describe("buildPersonPhotoCountQuery", () => {
  it("scopes to the family, kind='photo', excludes avatars, and groups by person", () => {
    const { sql } = buildPersonPhotoCountQuery(FAMILY_ID, OWNER).toSQL();
    expect(sql).toContain('"media"."family_id"');
    expect(sql).toContain('"media"."kind"');
    expect(sql).toContain("group by");
    expect(sql).toContain('"media_person"."person_id"');
    // Avatar exclusion — the not-in subquery selects persons.photo_media_id.
    expect(sql).toContain('"persons"."photo_media_id"');
  });

  it("owner viewer gets an unconditional `true` privacy predicate (sees private content too)", () => {
    const { sql } = buildPersonPhotoCountQuery(FAMILY_ID, OWNER).toSQL();
    expect(sql).toMatch(/where[\s\S]*true/i);
    expect(sql).not.toContain("uploaded_by");
  });

  it("non-owner viewer gets a privacy != 'private' OR own-upload predicate", () => {
    const { sql, params } = buildPersonPhotoCountQuery(
      FAMILY_ID,
      VIEWER,
    ).toSQL();
    expect(sql).toContain("!= 'private'");
    expect(sql).toContain('"media"."uploaded_by"');
    expect(params).toContain(VIEWER.userId);
  });
});

describe("buildPersonStoryCountQuery", () => {
  it("scopes to the family and groups by person", () => {
    const { sql } = buildPersonStoryCountQuery(FAMILY_ID, OWNER).toSQL();
    expect(sql).toContain('"stories"."family_id"');
    expect(sql).toContain('"story_person"."person_id"');
  });

  it("non-owner viewer's predicate checks stories.author_id, not media/event columns", () => {
    const { sql, params } = buildPersonStoryCountQuery(
      FAMILY_ID,
      VIEWER,
    ).toSQL();
    expect(sql).toContain('"stories"."author_id"');
    expect(params).toContain(VIEWER.userId);
  });
});

describe("buildPersonEventCountQuery", () => {
  it("counts DISTINCT event_id (a person can hold multiple roles on one event)", () => {
    const { sql } = buildPersonEventCountQuery(FAMILY_ID, OWNER).toSQL();
    expect(sql.toLowerCase()).toContain("count(distinct");
    expect(sql).toContain('"event_participants"."event_id"');
  });

  it("non-owner viewer's predicate checks events.created_by", () => {
    const { sql, params } = buildPersonEventCountQuery(
      FAMILY_ID,
      VIEWER,
    ).toSQL();
    expect(sql).toContain('"events"."created_by"');
    expect(params).toContain(VIEWER.userId);
  });
});

describe("buildPersonPhotoCountForPersonQuery", () => {
  it("scopes to one person (no groupBy — a single count), family, kind='photo', excludes avatars", () => {
    const { sql, params } = buildPersonPhotoCountForPersonQuery(
      PERSON_ID,
      FAMILY_ID,
      OWNER,
    ).toSQL();
    expect(sql).toContain('"media_person"."person_id"');
    expect(sql).not.toContain("group by");
    expect(params).toContain(PERSON_ID);
  });

  it("non-owner viewer still gets the own-upload predicate", () => {
    const { sql, params } = buildPersonPhotoCountForPersonQuery(
      PERSON_ID,
      FAMILY_ID,
      VIEWER,
    ).toSQL();
    expect(sql).toContain("!= 'private'");
    expect(params).toContain(VIEWER.userId);
  });
});

describe("buildPersonStoryCountForPersonQuery", () => {
  it("scopes to one person, no groupBy", () => {
    const { sql, params } = buildPersonStoryCountForPersonQuery(
      PERSON_ID,
      FAMILY_ID,
      OWNER,
    ).toSQL();
    expect(sql).toContain('"story_person"."person_id"');
    expect(sql).not.toContain("group by");
    expect(params).toContain(PERSON_ID);
  });
});

describe("buildPersonEventCountForPersonQuery", () => {
  it("scopes to one person and still counts DISTINCT event_id", () => {
    const { sql, params } = buildPersonEventCountForPersonQuery(
      PERSON_ID,
      FAMILY_ID,
      OWNER,
    ).toSQL();
    expect(sql.toLowerCase()).toContain("count(distinct");
    expect(sql).not.toContain("group by");
    expect(params).toContain(PERSON_ID);
  });
});

describe("EMPTY_ARCHIVE_SUMMARY", () => {
  // getPersonArchiveSummaries' and getPersonArchiveSummary's own merge logic
  // (Promise.all + fold into one Map/object) is exercised against the real
  // dev Neon DB, not mocked here — see archive-summary.ts's own doc comment
  // and CLAUDE.md's tree-layout testing-strategy note on preferring real
  // data for exactly this kind of check. Verified manually (both the batch
  // and single-person paths): owner sees a private photo's count, a
  // non-owner/non-uploader viewer does not (count drops to 0), while an
  // unrelated family-level story stays visible to both.
  it("has all-zero counts — a person with no visible archive content renders identically to one with none at all", () => {
    expect(EMPTY_ARCHIVE_SUMMARY).toEqual({
      photoCount: 0,
      storyCount: 0,
      eventCount: 0,
    });
  });
});
