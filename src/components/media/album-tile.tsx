import Link from "next/link";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/** One compact folder-style tile in AlbumGrid's grid row (cover + name +
 *  count) — everything that isn't the featured lead album. Split out of
 *  album-grid.tsx to keep both under CLAUDE.md's 150-line component limit. */
export function AlbumTile({
  album,
  familySlug,
  familyId,
}: {
  album: AlbumWithCoverRecord;
  familySlug: string;
  familyId: string;
}) {
  return (
    <Link
      href={`/families/${familySlug}/photos/${album.id}`}
      className="group flex flex-col gap-2 rounded-lg"
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
        {album.coverMediaId ? (
          <Image
            src={`/api/media/${album.coverMediaId}?familyId=${familyId}`}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImagesIcon className="size-8 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="truncate text-sm font-medium">{album.name}</span>
        <span className="text-xs text-muted-foreground">
          {photoCountLabel(album.photoCount)}
        </span>
      </div>
    </Link>
  );
}
