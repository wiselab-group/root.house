import { describe, expect, it } from "vitest";
import { batchProgress } from "./batch-upload-progress";

describe("batchProgress", () => {
  it("weights progress by file size, not by count", () => {
    const result = batchProgress([
      { sizeBytes: 100, progress: 1, status: "done" },
      { sizeBytes: 900, progress: 0.5, status: "uploading" },
    ]);
    expect(result.fraction).toBeCloseTo(0.55);
    expect(result).toMatchObject({ done: 1, started: 2, isActive: true });
  });

  it("leaves failed and not-yet-started files out of the total", () => {
    const result = batchProgress([
      { sizeBytes: 500, progress: 0.2, status: "error" },
      { sizeBytes: 500, progress: 0, status: "queued" },
      { sizeBytes: 100, progress: 1, status: "done" },
    ]);
    expect(result.fraction).toBe(1);
    expect(result).toMatchObject({
      done: 1,
      failed: 1,
      started: 2,
      isActive: false,
    });
  });

  it("is zero for an empty batch", () => {
    expect(batchProgress([]).fraction).toBe(0);
  });
});
