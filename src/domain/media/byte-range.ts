/** An inclusive byte range of a stored file, as in `Content-Range`. */
export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Resolves an HTTP `Range` request header against the file's size, for
 * serving audio (and later video) in pieces: seeking, and Safari, which
 * won't play audio from a server that can't answer ranges.
 *
 * - `null` → no usable range: serve the whole file (no header, another
 *   unit, several ranges at once, or a malformed one — RFC 9110 lets a
 *   server ignore those);
 * - `"unsatisfiable"` → 416: the range starts past the end of the file;
 * - otherwise the range, its end clamped to the file.
 */
export function resolveByteRange(
  header: string | null,
  size: number,
): ByteRange | "unsatisfiable" | null {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match || size <= 0) return null;
  const [, from, to] = match;
  if (from === "" && to === "") return null;

  if (from === "") {
    // Suffix range: the last N bytes.
    const length = Number(to);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(from);
  if (start >= size) return "unsatisfiable";
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  if (end < start) return null;
  return { start, end };
}
