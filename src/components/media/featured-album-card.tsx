import Link from "next/link";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * The most recent album, shown as a wide feature card with its name/count
 * overlaid on the cover via a scrim — one deliberate focal point per
 * bolder.md's "pick one thing to remember" — instead of every album
 * competing at the same identical small square. Split out of
 * album-grid.tsx to keep both under CLAUDE.md's 150-line component limit.
 */
export function FeaturedAlbumCard({
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
