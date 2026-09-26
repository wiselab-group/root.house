"use client";

import { useState } from "react";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { PhotoTagLayer } from "./photo-tag-layer";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * One photo in the lightbox. The image and everything over it (tag markers,
 * the spotlight, the tagging-mode ring) live in one "frame" box sized to
 * the photo's own contained rectangle — not the whole slide. Tag
 * coordinates are percentages of that frame, so a tag stays on the same
 * face at any window shape. (An earlier version measured them against the
 * whole slide, letterbox bands included: a tag placed on a wide screen
 * slid off the face on a phone.)
 *
 * The frame is pure CSS — `min()` over container query units of the slide,
 * from the photo's width/height. Those come from the stored dimensions
 * (set when the downscaled copies are made); a photo that has none yet
 * (just uploaded) falls back to the decoded image's natural size once it
 * loads, and to the whole slide until then.
 */
export function LightboxSlide({
  photo,
  familyId,
  familySlug,
  taggingMode,
  canTag,
  highlightedPersonId,
}: {
  photo: GalleryPhotoView;
  familyId: string;
  familySlug: string;
  taggingMode: boolean;
  canTag: boolean;
  highlightedPersonId: string | null;
}) {
  const [measured, setMeasured] = useState<{
    id: string;
    ratio: number;
  } | null>(null);
  const stored =
    photo.media.width && photo.media.height
      ? photo.media.width / photo.media.height
      : null;
  const ratio =
    stored ?? (measured?.id === photo.media.id ? measured.ratio : null);

  return (
    <div className="relative size-full [container-type:size]">
      <div
        className="absolute inset-0 m-auto"
        style={
          ratio
            ? {
                width: `min(100cqw, ${100 * ratio}cqh)`,
                height: `min(100cqh, ${100 / ratio}cqw)`,
              }
            : undefined
        }
      >
        <ArchiveImage
          src={mediaUrl(photo.media.id, familyId, "display")}
          alt={photo.media.title ?? "Семейное фото"}
          fill
          sizes="100vw"
          className="object-contain"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (!stored && naturalWidth && naturalHeight) {
              setMeasured({
                id: photo.media.id,
                ratio: naturalWidth / naturalHeight,
              });
            }
          }}
        />
        {taggingMode && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 ring-3 ring-primary ring-inset"
          />
        )}
        <PhotoTagLayer
          mediaId={photo.media.id}
          people={photo.people}
          taggingMode={taggingMode}
          canTag={canTag}
          familyId={familyId}
          familySlug={familySlug}
          highlightedPersonId={highlightedPersonId}
        />
      </div>
    </div>
  );
}
