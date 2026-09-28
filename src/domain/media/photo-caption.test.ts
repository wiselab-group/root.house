import { describe, expect, it } from "vitest";
import {
  normalizePhotoCaption,
  PHOTO_CAPTION_MAX_LENGTH,
} from "./photo-caption";
import { UploadRejectedError } from "./upload-rules";

describe("normalizePhotoCaption", () => {
  it("trims and collapses whitespace, including line breaks", () => {
    expect(normalizePhotoCaption("  Dacha,\n\n1978   summer ")).toBe(
      "Dacha, 1978 summer",
    );
  });

  it("treats empty, blank and non-string input as no caption", () => {
    expect(normalizePhotoCaption("")).toBeNull();
    expect(normalizePhotoCaption("   \n ")).toBeNull();
    expect(normalizePhotoCaption(undefined)).toBeNull();
    expect(normalizePhotoCaption(42)).toBeNull();
  });

  it("accepts exactly the maximum length", () => {
    const caption = "a".repeat(PHOTO_CAPTION_MAX_LENGTH);
    expect(normalizePhotoCaption(caption)).toBe(caption);
  });

  it("rejects a caption over the maximum with an error code", () => {
    const tooLong = "a".repeat(PHOTO_CAPTION_MAX_LENGTH + 1);
    expect(() => normalizePhotoCaption(tooLong)).toThrow(UploadRejectedError);
    expect(() => normalizePhotoCaption(tooLong)).toThrow("captionTooLong");
  });
});
