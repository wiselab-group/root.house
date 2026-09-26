import { describe, expect, it } from "vitest";
import {
  InvalidPhotoTagPointError,
  InvalidPhotoTagRadiusError,
  PHOTO_TAG_RADIUS_MAX,
  PHOTO_TAG_RADIUS_MIN,
  validatePhotoTagPoint,
  validatePhotoTagRadius,
} from "./photo-tag";

describe("validatePhotoTagPoint", () => {
  it("accepts a point in range", () => {
    expect(validatePhotoTagPoint({ xPercent: 42.5, yPercent: 17.25 })).toEqual({
      xPercent: 42.5,
      yPercent: 17.25,
    });
  });

  it("accepts the lower boundary (0)", () => {
    expect(validatePhotoTagPoint({ xPercent: 0, yPercent: 0 })).toEqual({
      xPercent: 0,
      yPercent: 0,
    });
  });

  it("accepts the upper boundary (100)", () => {
    expect(validatePhotoTagPoint({ xPercent: 100, yPercent: 100 })).toEqual({
      xPercent: 100,
      yPercent: 100,
    });
  });

  it("rounds to 2 decimal places", () => {
    expect(
      validatePhotoTagPoint({ xPercent: 33.33333, yPercent: 66.66666 }),
    ).toEqual({ xPercent: 33.33, yPercent: 66.67 });
  });

  it("rejects a negative value", () => {
    expect(() =>
      validatePhotoTagPoint({ xPercent: -0.01, yPercent: 50 }),
    ).toThrow(InvalidPhotoTagPointError);
  });

  it("rejects a value above 100", () => {
    expect(() =>
      validatePhotoTagPoint({ xPercent: 50, yPercent: 100.01 }),
    ).toThrow(InvalidPhotoTagPointError);
  });

  it("rejects NaN", () => {
    expect(() =>
      validatePhotoTagPoint({ xPercent: Number.NaN, yPercent: 50 }),
    ).toThrow(InvalidPhotoTagPointError);
  });

  it("rejects Infinity", () => {
    expect(() =>
      validatePhotoTagPoint({
        xPercent: 50,
        yPercent: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(InvalidPhotoTagPointError);
  });
});

describe("validatePhotoTagRadius", () => {
  it("accepts the bounds", () => {
    expect(validatePhotoTagRadius(PHOTO_TAG_RADIUS_MIN)).toBe(3);
    expect(validatePhotoTagRadius(PHOTO_TAG_RADIUS_MAX)).toBe(60);
  });

  it("rounds to 2 decimals", () => {
    expect(validatePhotoTagRadius(12.34567)).toBe(12.35);
  });

  it("rejects out of range instead of clamping", () => {
    expect(() => validatePhotoTagRadius(2.99)).toThrow(
      InvalidPhotoTagRadiusError,
    );
    expect(() => validatePhotoTagRadius(60.01)).toThrow(
      InvalidPhotoTagRadiusError,
    );
  });

  it("rejects NaN", () => {
    expect(() => validatePhotoTagRadius(Number.NaN)).toThrow(
      InvalidPhotoTagRadiusError,
    );
  });
});
