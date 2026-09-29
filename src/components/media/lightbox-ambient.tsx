"use client";

import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";

/**
 * The lightbox's backdrop glow: the current photo's thumbnail, blown up and
 * blurred far past recognition, low behind a veil of the page's own warm
 * background — the photo's tones bleed into the room around it instead of
 * sitting on flat black (same idea as the profile hero, where the photo
 * dissolves into the page). Re-keyed per photo so
 * each glow fades in with its photo.
 */
export function LightboxAmbient({
  mediaId,
  familyId,
}: {
  mediaId: string;
  familyId: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-[-10%] scale-110 opacity-40 blur-3xl saturate-125">
        <ArchiveImage
          key={mediaId}
          src={mediaUrl(mediaId, familyId, "thumb")}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-radial-[at_50%_45%] from-background/30 to-background/95 to-80%" />
    </div>
  );
}
