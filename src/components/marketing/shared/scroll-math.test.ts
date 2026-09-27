import { describe, expect, it } from "vitest";
import {
  clamp01,
  connectorOpacity,
  fragmentProgress,
  keywordOpacity,
  keywordPosition,
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
    expect(smoothstep(0.1)).toBeLessThan(0.1);
  });

  it("maps a sub-window onto 0..1", () => {
    expect(windowProgress(0.2, 0.3, 0.4)).toBe(0);
    expect(windowProgress(0.5, 0.3, 0.4)).toBeCloseTo(0.5);
    expect(windowProgress(0.9, 0.3, 0.4)).toBe(1);
  });
});

describe("keywords", () => {
  it("holds the first keyword at the top and the last at the bottom", () => {
    expect(keywordPosition(0, 5)).toBe(0);
    expect(keywordPosition(0.05, 5)).toBe(0);
    expect(keywordPosition(0.8, 5)).toBe(4);
    expect(keywordPosition(1, 5)).toBe(4);
  });

  it("rolls monotonically in between", () => {
    const samples = [0.1, 0.3, 0.5, 0.7].map((p) => keywordPosition(p, 5));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it("shows the focused word fully, the next one faintly, rolled-past ones not at all", () => {
    expect(keywordOpacity(0)).toBe(1);
    expect(keywordOpacity(1)).toBeCloseTo(0.2);
    expect(keywordOpacity(2)).toBe(0);
    expect(keywordOpacity(-1)).toBe(0);
  });
});

describe("memory box fragments", () => {
  it("every fragment starts scattered and ends in its slot", () => {
    for (let i = 0; i < 7; i++) {
      expect(fragmentProgress(0, i, 7)).toBe(0);
      expect(fragmentProgress(0.8, i, 7)).toBe(1);
    }
  });

  it("later fragments start later", () => {
    expect(fragmentProgress(0.3, 0, 7)).toBeGreaterThan(
      fragmentProgress(0.3, 6, 7),
    );
  });

  it("connectors wait until every card has landed", () => {
    expect(connectorOpacity(0.7)).toBe(0);
    expect(connectorOpacity(1)).toBe(1);
  });
});
