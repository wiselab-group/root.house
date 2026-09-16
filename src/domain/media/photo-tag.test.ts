import { describe, expect, it } from "vitest";
import { InvalidPhotoTagPointError, validatePhotoTagPoint } from "./photo-tag";

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
