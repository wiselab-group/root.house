import { describe, expect, it } from "vitest";
import { classifySearchQuery } from "./query-classifier";

describe("classifySearchQuery", () => {
  it("classifies a bare 4-digit year as a year_range of that single year", () => {
    expect(classifySearchQuery("1924")).toEqual({ kind: "year_range", yearFrom: 1924, yearTo: 1924 });
  });

  it("classifies a bare 3-digit year (pre-1000) as a year_range", () => {
    expect(classifySearchQuery("924")).toEqual({ kind: "year_range", yearFrom: 924, yearTo: 924 });
  });

  it("classifies a year range 'from-to'", () => {
    expect(classifySearchQuery("1900-1950")).toEqual({ kind: "year_range", yearFrom: 1900, yearTo: 1950 });
  });

  it("normalizes a reversed range (to < from)", () => {
    expect(classifySearchQuery("1950-1900")).toEqual({ kind: "year_range", yearFrom: 1900, yearTo: 1950 });
  });

  it("tolerates spaces around the range dash", () => {
    expect(classifySearchQuery("1900 - 1950")).toEqual({ kind: "year_range", yearFrom: 1900, yearTo: 1950 });
  });

  it("classifies a plain name as a name query", () => {
    expect(classifySearchQuery("Иванов")).toEqual({ kind: "name", text: "Иванов" });
  });

  it("classifies a name+patronymic-looking string as a name query, not a year", () => {
    expect(classifySearchQuery("Иван Петров")).toEqual({ kind: "name", text: "Иван Петров" });
  });

  it("trims whitespace from a name query", () => {
    expect(classifySearchQuery("  Иванов  ")).toEqual({ kind: "name", text: "Иванов" });
  });

  it("does not classify a 5+ digit number as a year", () => {
    expect(classifySearchQuery("19245")).toEqual({ kind: "name", text: "19245" });
  });

  it("does not classify a 1-2 digit number as a year", () => {
    expect(classifySearchQuery("42")).toEqual({ kind: "name", text: "42" });
  });
});
