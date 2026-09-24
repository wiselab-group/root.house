import { describe, expect, it } from "vitest";
import { photoBackdrop, photoBackdropStyle } from "./photo-backdrop";

describe("photoBackdrop", () => {
  it("falls back to the warm app hue when there is no photo color", () => {
    expect(photoBackdrop(null)).toEqual({ hue: 50, chroma: 0.02 });
    expect(photoBackdrop(undefined)).toEqual({ hue: 50, chroma: 0.02 });
  });

  it("falls back for malformed values instead of trusting them", () => {
    expect(photoBackdrop("red")).toEqual({ hue: 50, chroma: 0.02 });
    expect(photoBackdrop("#12345")).toEqual({ hue: 50, chroma: 0.02 });
  });

  it("treats a grey studio-wall sample as hueless (real avatar value #dfdfdf)", () => {
    expect(photoBackdrop("#dfdfdf")).toEqual({ hue: 50, chroma: 0.02 });
  });

  it("keeps a sepia photo's own hue", () => {
    const { hue, chroma } = photoBackdrop("#6b4e3a");
    expect(hue).toBeGreaterThan(40);
    expect(hue).toBeLessThan(70);
    expect(chroma).toBeGreaterThan(0.02);
  });

  it("caps chroma so a saturated photo never floods the page", () => {
    expect(photoBackdrop("#ff2200").chroma).toBe(0.04);
  });

  it("exposes the values as CSS custom properties", () => {
    expect(photoBackdropStyle(null)).toEqual({
      "--backdrop-hue": "50",
      "--backdrop-chroma": "0.02",
    });
  });
});
