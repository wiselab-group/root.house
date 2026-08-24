import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" ignores app/icon.svg entirely — it only reads
// apple-touch-icon, which must be an opaque raster (no alpha channel; iOS
// composites it onto a solid tile regardless, so a transparent PNG would
// just show as blank/black on the home screen). Mirrors BrandMark's glyph
// (the same accent-tinted house badge shown on the login screen) scaled up
// to fill the tile, so the home-screen icon reads as the same brand mark.
// The glyph is sized to leave only a thin margin — iOS/Android already
// inset and round the tile themselves (share-sheet, home screen, Settings),
// so extra padding here just reads as a small icon floating in a big box.
//
// Hex, not var(--color-name): satori (next/og's renderer) doesn't parse
// oklch(). #f6e8e0 is --primary at 10% opacity flattened onto --background
// (BrandMark's `bg-primary/10` badge), #b2511e is --primary itself — both
// exact sRGB conversions of the light-theme tokens in globals.css, not
// approximations. Keep in sync if those move.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6e8e0",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
            stroke="#b2511e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke="#b2511e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
