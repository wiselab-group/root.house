"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * next/image for family photos served through /api/media. Always
 * `unoptimized` — Next's optimizer can't cache our authenticated route, and
 * the photos are already downscaled at upload (see
 * domain/media/image-variants.ts).
 *
 * No blur placeholder: while a photo loads, its container's own background
 * shows through, and the photo fades in once decoded — nothing stored per
 * photo for it. Pass `fade={false}` for the page's main (LCP) image: an
 * element at opacity 0 doesn't count as painted, so fading it would delay
 * LCP; also for images with their own transform animation.
 */
export function ArchiveImage({
  alt,
  className,
  fade = true,
  onLoad,
  onError,
  ...props
}: Omit<ImageProps, "placeholder" | "blurDataURL" | "unoptimized"> & {
  fade?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!fade) {
    return (
      <Image
        {...props}
        alt={alt}
        className={className}
        onLoad={onLoad}
        onError={onError}
        unoptimized
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      unoptimized
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      // A broken photo still shows (its alt text) rather than staying invisible.
      onError={(event) => {
        setLoaded(true);
        onError?.(event);
      }}
      // The caller's own duration/transition may win (a hover zoom), but the
      // transition list always includes opacity so the fade still runs.
      className={cn(
        "duration-500 ease-(--ease-reveal)",
        className,
        "transition-[opacity,scale,translate,rotate] motion-reduce:transition-none",
        loaded ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
