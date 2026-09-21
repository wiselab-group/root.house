import { describe, expect, it } from "vitest";
import { activeCardIndex, cardTransformForProgress } from "./scroll-stack-math";

describe("activeCardIndex", () => {
  it("picks the first card at the very start", () => {
    expect(activeCardIndex(0, 3)).toBe(0);
  });

  it("picks the last card at the very end, without overrunning", () => {
    expect(activeCardIndex(1, 3)).toBe(2);
  });

  it("picks the middle card partway through", () => {
    expect(activeCardIndex(0.5, 3)).toBe(1);
  });
});

describe("cardTransformForProgress", () => {
  it("keeps an upcoming card dimmed and not yet settled", () => {
    const result = cardTransformForProgress(0, 1, 3);
    expect(result.opacity).toBe(0);
    expect(result.scale).toBeLessThan(1);
  });

  it("fully settles the active card in the middle of its own slice", () => {
    const result = cardTransformForProgress(1 / 6, 0, 3);
    expect(result.opacity).toBe(1);
    expect(result.scale).toBeCloseTo(1);
    expect(result.translateY).toBeCloseTo(0);
  });

  it("eases the card out near the end of its own slice", () => {
    const result = cardTransformForProgress(0.3, 0, 3);
    expect(result.opacity).toBeLessThan(1);
    expect(result.opacity).toBeGreaterThan(0);
  });

  it("recedes a card once progress has moved past its slice", () => {
    const result = cardTransformForProgress(1, 0, 3);
    expect(result.opacity).toBe(0);
    expect(result.translateY).toBeLessThan(0);
  });
});
