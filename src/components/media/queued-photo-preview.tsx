"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * A picked file's local preview in the upload queue. Browsers other than
 * Safari can't draw HEIC, so instead of a broken-image glyph the tile shows
 * a quiet photo icon with the format — the uploaded copy (made on the
 * server, see image-variants.ts) looks right afterwards.
 */
export function QueuedPhotoPreview({
  previewUrl,
  fileName,
}: {
  previewUrl: string;
  fileName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const extension = fileName.split(".").pop()?.toUpperCase();
    return (
      <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
        <ImageIcon className="size-6" strokeWidth={1.5} aria-hidden="true" />
        {extension && (
          <span className="text-[10px] tracking-wide">{extension}</span>
        )}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob: preview of a not-yet-uploaded File
    <img
      src={previewUrl}
      alt=""
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
