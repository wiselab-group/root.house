import { describe, expect, it } from "vitest";
import {
  cameraAt,
  clamp01,
  fragmentProgress,
  gatheredProgress,
  smoothstep,
  stepPosition,
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

describe("fragmentProgress / gatheredProgress", () => {
  it("starts every fragment scattered and ends every one gathered", () => {
    for (let i = 0; i < 7; i++) {
      expect(fragmentProgress(0, i, 7)).toBe(0);
      expect(fragmentProgress(0.75, i, 7)).toBe(1);
    }
  });

  it("staggers the fragments: earlier ones are further along", () => {
    expect(fragmentProgress(0.3, 0, 7)).toBeGreaterThan(
      fragmentProgress(0.3, 6, 7),
    );
  });

  it("shows the gathered card only at the end", () => {
    expect(gatheredProgress(0.3)).toBe(0);
    expect(gatheredProgress(1)).toBe(1);
  });
});

describe("stepPosition / cameraAt", () => {
  it("holds the first step at the start and the last at the end", () => {
    expect(stepPosition(0, 6)).toBe(0);
    expect(stepPosition(0.03, 6)).toBe(0);
    expect(stepPosition(0.9, 6)).toBe(5);
    expect(stepPosition(1, 6)).toBe(5);
  });

  const cameras = [
    { x: 0, y: 0, scale: 2 },
    { x: 10, y: 20, scale: 1 },
  ];

  it("lands exactly on a step's camera at whole positions", () => {
    expect(cameraAt(cameras, 0)).toEqual(cameras[0]);
    expect(cameraAt(cameras, 1)).toEqual(cameras[1]);
  });

  it("blends halfway between steps and clamps past the last one", () => {
    expect(cameraAt(cameras, 0.5)).toEqual({ x: 5, y: 10, scale: 1.5 });
    expect(cameraAt(cameras, 4)).toEqual(cameras[1]);
  });
});
