import { describe, expect, it } from "vitest";
import { ensureUniqueSlug, isValidSlugFormat, slugify } from "./slug";

describe("slugify", () => {
  it("transliterates Cyrillic names to a lowercase Latin slug", () => {
    expect(slugify("Купчик")).toBe("kupchik");
  });

  it("replaces spaces and punctuation with single hyphens", () => {
    expect(slugify("Семья  Иванов-Петров!")).toBe("semya-ivanov-petrov");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  -Родионовы- ")).toBe("rodionovy");
  });

  it("falls back to a generic slug when the name has no usable characters", () => {
    expect(slugify("!!!")).toBe("family");
  });

  it("truncates to the max slug length", () => {
    const longName = "а".repeat(100);
    expect(slugify(longName).length).toBeLessThanOrEqual(64);
  });
});

describe("isValidSlugFormat", () => {
  it("accepts a well-formed slug", () => {
    expect(isValidSlugFormat("kupchik")).toBe(true);
    expect(isValidSlugFormat("ivanov-petrov")).toBe(true);
  });

  it("rejects uppercase, spaces, and leading/trailing hyphens", () => {
    expect(isValidSlugFormat("Kupchik")).toBe(false);
    expect(isValidSlugFormat("kup chik")).toBe(false);
    expect(isValidSlugFormat("-kupchik")).toBe(false);
    expect(isValidSlugFormat("kupchik-")).toBe(false);
  });

  it("rejects reserved route segments", () => {
    expect(isValidSlugFormat("api")).toBe(false);
    expect(isValidSlugFormat("login")).toBe(false);
    expect(isValidSlugFormat("families")).toBe(false);
  });

  it("rejects too-short or too-long slugs", () => {
    expect(isValidSlugFormat("a")).toBe(false);
    expect(isValidSlugFormat("a".repeat(65))).toBe(false);
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base slug when it's free", async () => {
    const result = await ensureUniqueSlug("kupchik", async () => false);
    expect(result).toBe("kupchik");
  });

  it("appends an incrementing suffix until a free slug is found", async () => {
    const taken = new Set(["kupchik", "kupchik-2", "kupchik-3"]);
    const result = await ensureUniqueSlug("kupchik", async (candidate) => taken.has(candidate));
    expect(result).toBe("kupchik-4");
  });
});
