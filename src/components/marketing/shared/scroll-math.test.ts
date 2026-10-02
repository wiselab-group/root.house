import { describe, expect, it } from "vitest";
import {
  clamp01,
  fragmentProgress,
  gatheredProgress,
  smoothstep,
  windowProgress,
} from "./scroll-math";

describe("clamp01 / smoothstep / windowProgress", () => {
  it("clamps into 0..1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });

  it("smoothstep keeps its ends and midpoint", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });

  it("maps a sub-window onto 0..1", () => {
    expect(windowProgress(0.2, 0.3, 0.4)).toBe(0);
    expect(windowProgress(0.5, 0.3, 0.4)).toBeCloseTo(0.5);
    expect(windowProgress(0.9, 0.3, 0.4)).toBe(1);
  });
});

describe("fragmentProgress / gatheredProgress", () => {
  it("keeps every fragment scattered at first and gathered at the end", () => {
    for (let i = 0; i < 7; i++) {
      expect(fragmentProgress(0.1, i, 7)).toBe(0);
      expect(fragmentProgress(0.8, i, 7)).toBe(1);
    }
  });

  it("staggers the fragments: earlier ones are further along", () => {
    expect(fragmentProgress(0.4, 0, 7)).toBeGreaterThan(
      fragmentProgress(0.4, 6, 7),
    );
  });

  it("shows the gathered card only at the end", () => {
    expect(gatheredProgress(0.5)).toBe(0);
    expect(gatheredProgress(1)).toBe(1);
  });
});
