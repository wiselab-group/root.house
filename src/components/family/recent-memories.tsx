import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";
import type { GalleryPhoto } from "@/domain/media/media.service";

/**
 * "Latest memories" preview on Family Home — a small photo grid linking
 * through to the full Archive, not a re-implementation of PhotoGrid (no
 * lightbox/reorder/tagging needed here, just a glance). Caller passes an
 * already-visibility-filtered, already-sliced list (see families/[slug]/
 * page.tsx) — this component does no fetching or filtering of its own.
 */
export function RecentMemories({
  photos,
  familyId,
  familySlug,
}: {
  photos: GalleryPhoto[];
  familyId: string;
  familySlug: string;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-medium">Последние фото</h2>
        <Link
          href={`/families/${familySlug}/photos`}
          className="group flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Весь архив
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {photos.map((photo) => (
          <Link
            key={photo.media.id}
            href={`/families/${familySlug}/photos`}
            className="relative aspect-square overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"
          >
            <Image
              src={`/api/media/${photo.media.id}?familyId=${familyId}`}
              alt={photo.media.title ?? "Семейное фото"}
              fill
              sizes="(max-width: 640px) 33vw, 16vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
              unoptimized
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
