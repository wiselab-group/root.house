import { describe, expect, it } from "vitest";

// story.service imports the repositories, whose lazy `db` proxy throws at
// first property access without DATABASE_URL — these tests never query.
process.env.DATABASE_URL ??=
  "postgres://user:password@localhost/db?sslmode=require";

const { filterVisibleStories, canEditStory } = await import("./story.service");
type StoryRecord = import("./story.service").StoryRecord;

const AUTHOR = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";

function story(overrides: Partial<StoryRecord>): StoryRecord {
  return {
    id: "s1",
    familyId: "f1",
    slug: "s",
    title: "Мост через Неман",
    body: "Текст",
    privacyLevel: "family",
    authorId: AUTHOR,
    status: "published",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    publishedAt: new Date(0),
    ...overrides,
  };
}

describe("filterVisibleStories", () => {
  it("drops drafts for everyone — the author's own live in «Мои черновики»", () => {
    const stories = [
      story({ id: "pub" }),
      story({ id: "draft", status: "draft" }),
    ];
    for (const member of [
      { userId: AUTHOR, role: "contributor" as const },
      { userId: OTHER, role: "owner" as const },
    ]) {
      expect(filterVisibleStories(stories, member).map((s) => s.id)).toEqual([
        "pub",
      ]);
    }
  });

  it("still applies the PRIVATE rule to published stories", () => {
    const stories = [story({ privacyLevel: "private" })];
    expect(
      filterVisibleStories(stories, { userId: OTHER, role: "viewer" }),
    ).toEqual([]);
    expect(
      filterVisibleStories(stories, { userId: OTHER, role: "owner" }),
    ).toHaveLength(1);
  });
});

describe("canEditStory", () => {
  it("a draft is editable by its author only — not even by the owner", () => {
    const draft = story({ status: "draft" });
    expect(canEditStory({ userId: AUTHOR, role: "contributor" }, draft)).toBe(
      true,
    );
    expect(canEditStory({ userId: OTHER, role: "owner" }, draft)).toBe(false);
    expect(canEditStory({ userId: OTHER, role: "editor" }, draft)).toBe(false);
  });

  it("a published story follows the usual canEdit rule", () => {
    const published = story({});
    expect(canEditStory({ userId: OTHER, role: "editor" }, published)).toBe(
      true,
    );
    expect(canEditStory({ userId: OTHER, role: "viewer" }, published)).toBe(
      false,
    );
  });
});
