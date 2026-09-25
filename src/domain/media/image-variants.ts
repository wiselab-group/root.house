import sharp from "sharp";
import heicConvert from "heic-convert";
import type { MediaVariantName } from "@/db/schema";

/**
 * Downscaled WebP copies of an uploaded photo. The original is kept
 * untouched (it's an archive — a family must get back exactly what it
 * uploaded); these copies are what every screen actually shows, so a tree of
 * 50 people doesn't pull 50 full phone photos just to fill 88px circles.
 *
 * Longest side, in px — never enlarged past the original:
 * - thumb: trees, avatars, grids and album covers (a ~350px square tile at
 *   2x still has enough pixels on the short side of a 4:3 photo);
 * - display: lightbox, profile hero, story slides.
 */
export const VARIANT_LONGEST_SIDE: Record<MediaVariantName, number> = {
  thumb: 800,
  display: 2048,
};

const WEBP_QUALITY: Record<MediaVariantName, number> = {
  thumb: 76,
  display: 82,
};

export interface ImageVariantOutput {
  name: MediaVariantName;
  buffer: Buffer;
  width: number;
  height: number;
}

export interface ProcessedImage {
  /** The original's own dimensions, as displayed (after EXIF orientation). */
  width: number;
  height: number;
  variants: ImageVariantOutput[];
}

/**
 * HEIC (iPhone's default) — detected by content, not only by the declared
 * type, since browsers often send it as an empty or generic type. The ISO
 * BMFF `ftyp` box's major brand sits at bytes 8–12.
 */
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
]);

export function isHeic(file: Buffer, contentType: string): boolean {
  if (contentType === "image/heic" || contentType === "image/heif") return true;
  if (file.byteLength < 12 || file.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }
  return HEIC_BRANDS.has(file.toString("ascii", 8, 12));
}

/**
 * sharp's prebuilt libvips reads AVIF but not HEVC-coded HEIC, so HEIC goes
 * through heic-convert (libheif compiled to WASM) to a high-quality JPEG
 * first — only as the input for the variants; the stored original stays HEIC.
 */
async function decodableInput(
  file: Buffer,
  contentType: string,
): Promise<Buffer> {
  if (!isHeic(file, contentType)) return file;
  try {
    const jpeg = await heicConvert({
      buffer: file,
      format: "JPEG",
      quality: 0.95,
    });
    return Buffer.from(jpeg);
  } catch {
    // Not actually HEVC (an AVIF under a shared "mif1" brand, say) — sharp
    // may still read it directly.
    return file;
  }
}

/**
 * Builds every variant from one decode. `.rotate()` with no argument applies
 * the EXIF orientation (phone photos are often stored sideways), and sharp's
 * output drops all metadata by default — the variants carry no GPS
 * coordinates or camera details, and are converted to sRGB.
 */
export async function processImage(
  file: Buffer,
  contentType: string,
): Promise<ProcessedImage> {
  const input = await decodableInput(file, contentType);
  const base = sharp(input, { failOn: "none" }).rotate();
  const metadata = await base.metadata();
  // autoOrient = the dimensions as displayed, after EXIF orientation.
  const { width, height } = metadata.autoOrient;

  const names = Object.keys(VARIANT_LONGEST_SIDE) as MediaVariantName[];
  const variants = await Promise.all(
    names.map(async (name) => {
      const side = VARIANT_LONGEST_SIDE[name];
      const { data, info } = await base
        .clone()
        .resize({
          width: side,
          height: side,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY[name] })
        .toBuffer({ resolveWithObject: true });
      return { name, buffer: data, width: info.width, height: info.height };
    }),
  );

  return { width, height, variants };
}
