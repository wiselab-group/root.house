import Link from "next/link";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * Album list as a grid of folder-like cards (cover photo + name + count),
 * VK/Google Photos-style — an album reads as "a place with photos in it"
 * you open, not just a filter pill. Only rendered on the unfiltered /photos
 * page; once an album is open, the breadcrumb above is the way back out.
 */
export function AlbumGrid({
  familySlug,
  albums,
  familyId,
}: {
  familySlug: string;
  albums: AlbumWithCoverRecord[];
  familyId: string;
}) {
  if (albums.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {albums.map((album) => (
        <li key={album.id}>
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
        </li>
      ))}
    </ul>
  );
}
