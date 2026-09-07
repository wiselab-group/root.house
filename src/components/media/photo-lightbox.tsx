"use client";

import Link from "next/link";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteMediaButton } from "@/components/forms/delete-media-button";
import { personDisplayName } from "@/domain/person/display-name";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * Full-screen photo viewer for the family gallery — built directly on
 * @base-ui/react/dialog (not the centered ui/dialog.tsx wrapper, which is
 * capped at sm:max-w-sm) so it gets focus-trap/Escape/scroll-lock "for
 * free" while filling the viewport edge to edge. Shows who's tagged on the
 * current photo (linking to their profile) and lets the user step through
 * the gallery with prev/next without closing the overlay.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  familyId,
  familySlug,
  canEdit,
}: {
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  familyId: string;
  familySlug: string;
  canEdit: boolean;
}) {
  const photo = photos[index];
  if (!photo) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/90 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          <DialogPrimitive.Title className="sr-only">
            {photo.media.title ?? "Семейное фото"}
          </DialogPrimitive.Title>

          <div className="flex items-center justify-end gap-2 p-3">
            {canEdit && (
              <DeleteMediaButton
                familyId={familyId}
                familySlug={familySlug}
                mediaId={photo.media.id}
              />
            )}
            <DialogPrimitive.Close
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-sm"
                  aria-label="Закрыть"
                />
              }
            >
              <XIcon />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            <div className="relative h-full w-full max-w-4xl">
              <Image
                src={`/api/media/${photo.media.id}?familyId=${familyId}`}
                alt={photo.media.title ?? "Семейное фото"}
                fill
                sizes="100vw"
                className="object-contain"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
                unoptimized
              />
            </div>

            {hasPrev && (
              <button
                type="button"
                aria-label="Предыдущее фото"
                onClick={() => onIndexChange(index - 1)}
                className={cn(
                  "absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60",
                )}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                aria-label="Следующее фото"
                onClick={() => onIndexChange(index + 1)}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            )}
          </div>

          {photo.people.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
              {photo.people.map((person) => (
                <Link
                  key={person.id}
                  href={`/families/${familySlug}/people/${person.slug}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                >
                  {personDisplayName(person)}
                </Link>
              ))}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
