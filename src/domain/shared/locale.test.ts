import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./locale";

describe("negotiateLocale", () => {
  it("falls back to Russian without a header", () => {
    expect(negotiateLocale(null)).toBe("ru");
    expect(negotiateLocale("")).toBe("ru");
  });

  it("matches on the primary subtag", () => {
    expect(negotiateLocale("en-GB,en;q=0.9")).toBe("en");
    expect(negotiateLocale("ru-RU")).toBe("ru");
  });

  it("respects q-weights over header order", () => {
    expect(negotiateLocale("ru;q=0.5,en;q=0.8")).toBe("en");
  });

  it("skips unsupported languages", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.5")).toBe("en");
    expect(negotiateLocale("fr,de")).toBe("ru");
  });

  it("ignores q=0", () => {
    expect(negotiateLocale("en;q=0,ru;q=0.1")).toBe("ru");
  });
});
