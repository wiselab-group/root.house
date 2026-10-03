/**
 * Resolves a CSS custom property (`--primary`) to an `rgba(...)` string a
 * WebGL renderer can parse. MapLibre's paint properties don't understand
 * oklch(), and getComputedStyle hands the token back verbatim, so the
 * browser paints one pixel with it and we read the pixel back — the one
 * conversion every engine agrees on. Client-only (needs a canvas).
 */
export function resolveCssColor(token: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!value) return fallback;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.fillStyle = fallback;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}
