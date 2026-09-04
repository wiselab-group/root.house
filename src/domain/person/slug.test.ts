import { describe, expect, it } from "vitest";
import {
  ensureUniqueSlug,
  isValidPersonSlugFormat,
  slugifyPerson,
} from "./slug";

describe("slugifyPerson", () => {
  it("uses only the first name, not last name", () => {
    expect(
      slugifyPerson(
        { firstName: "Александр", nickname: null, isPlaceholder: false },
        "any-id",
      ),
    ).toBe("aleksandr");
  });

  it("falls back to nickname when first name is missing", () => {
    expect(
      slugifyPerson(
        { firstName: null, nickname: "Дюша", isPlaceholder: false },
        "any-id",
      ),
    ).toBe("dyusha");
  });

  it("falls back to a deterministic id-based slug for a fully blank placeholder", () => {
    const slug = slugifyPerson(
      { firstName: null, nickname: null, isPlaceholder: true },
      "b2149974-ad6d-4214-b6ab-9f7a31dc4d20",
    );
    expect(slug).toBe("person-b2149974");
  });

  it("falls back to an id-based slug when the name has no usable characters", () => {
    const slug = slugifyPerson(
      { firstName: "!!!", nickname: null, isPlaceholder: false },
      "b2149974-ad6d-4214-b6ab-9f7a31dc4d20",
    );
    expect(slug).toBe("person-b2149974");
  });
});

describe("isValidPersonSlugFormat", () => {
  it("accepts a well-formed slug", () => {
    expect(isValidPersonSlugFormat("alexander")).toBe(true);
    expect(isValidPersonSlugFormat("person-b2149974")).toBe(true);
  });

  it("rejects uppercase, spaces, and leading/trailing hyphens", () => {
    expect(isValidPersonSlugFormat("Alexander")).toBe(false);
    expect(isValidPersonSlugFormat("alex ander")).toBe(false);
    expect(isValidPersonSlugFormat("-alexander")).toBe(false);
  });

  it("rejects 'new' — the one real static sibling route (/families/[slug]/people/new)", () => {
    expect(isValidPersonSlugFormat("new")).toBe(false);
  });

  it("has no other reserved words — 'edit' is a nested segment under [personSlug], not a sibling", () => {
    expect(isValidPersonSlugFormat("edit")).toBe(true);
  });
});

describe("ensureUniqueSlug (person scope)", () => {
  it("appends an incrementing suffix scoped to collisions within one family", async () => {
    const takenInFamily = new Set(["alexander", "alexander-2"]);
    const result = await ensureUniqueSlug("alexander", async (candidate) =>
      takenInFamily.has(candidate),
    );
    expect(result).toBe("alexander-3");
  });
});
