import type { CSSProperties } from "react";

/**
 * Head-and-shoulders silhouette standing in for an old photograph's
 * subject — the landing has no real family photos, and a drawn silhouette
 * reads as "a person in a photo" without pretending to be one. Colored via
 * currentColor.
 */
export function PortraitSilhouette({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={style}
      fill="currentColor"
    >
      <circle cx="50" cy="38" r="17" />
      <path d="M18 100c0-22 14-36 32-36s32 14 32 36z" />
    </svg>
  );
}
