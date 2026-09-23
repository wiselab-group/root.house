import sharp from "sharp";

/**
 * Average color of an image's left edge (a thin vertical strip, ~10% of its
 * width), as "#rrggbb" — used by PersonProfileHero to fade its dark banner
 * background into a color that matches the avatar instead of a fixed brand
 * tone. Resizes to 1x1 over just that strip so sharp does the averaging
 * itself rather than reading out a raw pixel buffer.
 *
 * Fails soft: returns null on any decode error instead of throwing, so a
 * format sharp can't read — HEIC in particular, since its prebuilt binaries
 * generally don't include libheif (patent-encumbered, not bundled by
 * default) — never blocks the upload itself. Callers must treat null as
 * "no computed color" and fall back to a fixed tone.
 */
export async function sampleLeftEdgeColor(
  file: Buffer,
): Promise<string | null> {
  try {
    const image = sharp(file);
    const { width, height } = await image.metadata();
    if (!width || !height) return null;

    const stripWidth = Math.max(1, Math.round(width * 0.1));
    const { data } = await image
      .extract({ left: 0, top: 0, width: stripWidth, height })
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const [r, g, b] = data;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return null;
  }
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, "0");
}
