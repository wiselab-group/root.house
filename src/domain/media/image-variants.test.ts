import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isHeic, processImage, VARIANT_LONGEST_SIDE } from "./image-variants";

/** A 3000×2000 JPEG stored sideways (EXIF orientation 6) with GPS in its EXIF — what a phone produces. */
async function phoneJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 120, g: 90, b: 60 },
    },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestPhone" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "53/1 54/1 0/1" },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("processImage", () => {
  it("makes WebP variants, upright, within their size, without metadata", async () => {
    const input = await phoneJpeg();
    // The fixture really carries what we strip.
    const inputMeta = await sharp(input).metadata();
    expect(inputMeta.orientation).toBe(6);
    expect(inputMeta.exif?.toString("latin1")).toContain("TestPhone");

    const result = await processImage(input, "image/jpeg");

    // Orientation 6 = rotated 90° — displayed portrait.
    expect(result).toMatchObject({ width: 2000, height: 3000 });
    expect(result.variants.map((variant) => variant.name).sort()).toEqual([
      "display",
      "thumb",
    ]);

    for (const variant of result.variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.height).toBe(VARIANT_LONGEST_SIDE[variant.name]);
      expect(meta.width).toBeLessThan(meta.height ?? 0);
      expect([variant.width, variant.height]).toEqual([
        meta.width,
        meta.height,
      ]);
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
    }
  });

  it("never enlarges a photo smaller than a variant", async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#806040" },
    })
      .png()
      .toBuffer();

    const result = await processImage(small, "image/png");

    for (const variant of result.variants) {
      expect([variant.width, variant.height]).toEqual([300, 200]);
    }
  });

  it("rejects a file that isn't an image", async () => {
    await expect(
      processImage(Buffer.from("not an image"), "image/jpeg"),
    ).rejects.toThrow();
  });
});

describe("isHeic", () => {
  const ftyp = (brand: string) =>
    Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from(`ftyp${brand}`, "ascii"),
      Buffer.alloc(12),
    ]);

  it("trusts the declared type", () => {
    expect(isHeic(Buffer.alloc(0), "image/heic")).toBe(true);
    expect(isHeic(Buffer.alloc(0), "image/heif")).toBe(true);
  });

  it("recognizes HEIC by its ftyp brand when the type is generic", () => {
    expect(isHeic(ftyp("heic"), "application/octet-stream")).toBe(true);
    expect(isHeic(ftyp("avif"), "application/octet-stream")).toBe(false);
    expect(
      isHeic(Buffer.from("\xff\xd8\xff\xe0", "latin1"), "image/jpeg"),
    ).toBe(false);
  });
});
