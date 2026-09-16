import Link from "next/link";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/** One compact folder-style tile in AlbumGrid's grid row (cover + name +
 *  count) — everything that isn't the featured lead album. Name/count are
 *  overlaid on the cover via the same scrim treatment as
 *  FeaturedAlbumCard (not a caption below the image) so every album card
 *  reads as one consistent family, just at two sizes. Split out of
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
      className="group relative flex aspect-square flex-col overflow-hidden rounded-md border border-border bg-muted"
    >
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
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent"
      />
      <div className="relative mt-auto flex flex-col gap-0 p-2.5">
        <span className="truncate text-sm font-medium text-white">
          {album.name}
        </span>
        <span className="text-xs text-white/80">
          {photoCountLabel(album.photoCount)}
        </span>
      </div>
    </Link>
  );
}
