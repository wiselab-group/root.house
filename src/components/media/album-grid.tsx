import Link from "next/link";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * Album list as a grid of folder-like cards, VK/Google Photos-style — an
 * album reads as "a place with photos in it" you open, not just a filter
 * pill. Only rendered on the unfiltered /photos page; once an album is
 * open, the breadcrumb above is the way back out.
 *
 * The most recent album (albums[0], the list is already newest-first from
 * listAlbumsWithCover) leads as a wide feature card with its name/count
 * overlaid on the cover via a scrim — one deliberate focal point per
 * bolder.md's "pick one thing to remember" — instead of every album
 * competing at the same identical small square. The rest stay compact
 * folder tiles below; that contrast (one bold lead, quiet followers) is the
 * hierarchy amplification, not a louder treatment applied to all of them.
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

  const [featured, ...rest] = albums;

  return (
    <div className="flex flex-col gap-3">
      <FeaturedAlbumCard
        album={featured}
        familySlug={familySlug}
        familyId={familyId}
      />
      {rest.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((album) => (
            <li key={album.id}>
              <AlbumTile
                album={album}
                familySlug={familySlug}
                familyId={familyId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeaturedAlbumCard({
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
      className="group relative flex aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted sm:aspect-[21/9]"
    >
      {album.coverMediaId ? (
        <Image
          src={`/api/media/${album.coverMediaId}?familyId=${familyId}`}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 672px"
          className="object-cover transition-transform duration-300 ease-(--ease-reveal) group-hover:scale-[1.03]"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          unoptimized
          priority
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImagesIcon className="size-10 text-muted-foreground/50" />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
      />
      <div className="relative mt-auto flex flex-col gap-0.5 p-4 sm:p-5">
        <span className="font-heading text-xl font-medium text-balance text-white sm:text-2xl">
          {album.name}
        </span>
        <span className="text-sm text-white/80">
          {photoCountLabel(album.photoCount)}
        </span>
      </div>
    </Link>
  );
}

function AlbumTile({
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
