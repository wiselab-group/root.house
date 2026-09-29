import { describe, expect, it } from "vitest";
import { resolveByteRange } from "./byte-range";

describe("resolveByteRange", () => {
  it("serves the whole file without a usable range", () => {
    expect(resolveByteRange(null, 1000)).toBeNull();
    expect(resolveByteRange("bytes=-", 1000)).toBeNull();
    expect(resolveByteRange("bytes=0-10, 20-30", 1000)).toBeNull();
    expect(resolveByteRange("items=0-10", 1000)).toBeNull();
    expect(resolveByteRange("bytes=50-10", 1000)).toBeNull();
  });

  it("resolves open, closed and suffix ranges", () => {
    expect(resolveByteRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
    expect(resolveByteRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
    expect(resolveByteRange("bytes=900-5000", 1000)).toEqual({
      start: 900,
      end: 999,
    });
    expect(resolveByteRange("bytes=-100", 1000)).toEqual({
      start: 900,
      end: 999,
    });
    expect(resolveByteRange("bytes=-5000", 1000)).toEqual({
      start: 0,
      end: 999,
    });
  });

  it("refuses a range past the end", () => {
    expect(resolveByteRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(resolveByteRange("bytes=-0", 1000)).toBe("unsatisfiable");
  });
});
