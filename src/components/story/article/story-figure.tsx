import { useTranslations } from "next-intl";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { StoryPhoto } from "@/domain/story/story-doc";
import type { StoryRefs } from "./story-refs";

/**
 * A family photo inside the story's text, with its caption. `wide` breaks
 * out of the reading column (full-bleed on a phone, 7.5rem past each side
 * of the column on a desktop, where the column has that much room). A
 * photo the reader may not see (or that was deleted) isn't in `refs` and
 * renders nothing.
 */
export function StoryFigure({
  block,
  refs,
}: {
  block: StoryPhoto;
  refs: StoryRefs;
}) {
  const tc = useTranslations("common");
  const photo = refs.photos[block.attrs.mediaId];
  if (!photo) return null;
  const { wide, caption } = block.attrs;

  return (
    <figure
      className={cn(
        "my-2 flex flex-col gap-2.5",
        wide && "-mx-4 sm:-mx-8 lg:-mx-30",
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-muted shadow-[0_30px_50px_-30px_color-mix(in_oklch,black_70%,transparent)]",
          wide ? "sm:rounded-[1.375rem]" : "rounded-[1.375rem]",
        )}
      >
        <ArchiveImage
          src={mediaUrl(block.attrs.mediaId, refs.familyId, "display")}
          alt={caption || photo.alt || tc("familyPhoto")}
          width={photo.width ?? 1600}
          height={photo.height ?? 1067}
          sizes={
            wide
              ? "(max-width: 1024px) 100vw, 944px"
              : "(max-width: 768px) 100vw, 640px"
          }
          className="h-auto w-full"
        />
      </div>
      {caption && (
        <figcaption
          className={cn(
            "text-[0.8125rem] leading-snug text-pretty text-foreground/64",
            // Full-bleed on a phone: the caption keeps the text's gutter.
            wide && "px-4 sm:px-0",
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
