"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { UserPlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPill } from "@/components/hero/glass";
import type { GalleryPhotoView } from "./gallery-photo";
import { LightboxFilmstrip } from "./lightbox-filmstrip";
import { LightboxPeopleFit } from "./lightbox-people-fit";
import { LightboxPeopleScroller } from "./lightbox-people-scroller";
import { LightboxStripTabs, type StripMode } from "./lightbox-strip-tabs";

type TaggedPerson = GalleryPhotoView["people"][number];

/**
 * The lightbox's one bottom strip (variant C2 of the 2026-09-29 mock): the
 * same fixed-height place shows either who's on the photo or the whole
 * gallery as a filmstrip. Replaced a caption line + a wrapping row of name
 * chips whose height changed with the number of tags, so the photo above
 * shrank and grew while paging.
 *
 * Desktop: tabs on the left, content centered in the room left between
 * them and the mirrored right margin. Phones: people only — paging is a
 * swipe there, and 40px thumbnails in a narrow row tell nothing.
 */
export function LightboxStrip({
  wide,
  mode,
  onModeChange,
  tagging,
  canTag,
  onStartTagging,
  photos,
  index,
  onIndexChange,
  people,
  familyId,
  familySlug,
  highlightedPersonId,
  onHighlight,
}: {
  wide: boolean;
  /** Already resolved: tagging pins it to "people". */
  mode: StripMode;
  onModeChange: (mode: StripMode) => void;
  tagging: boolean;
  canTag: boolean;
  onStartTagging: () => void;
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Already in left-to-right order. */
  people: TaggedPerson[];
  familyId: string;
  familySlug: string;
  highlightedPersonId: string | null;
  onHighlight: (personId: string | null) => void;
}) {
  const t = useTranslations("media");
  const panelId = useId();
  const peopleProps = { people, familySlug, highlightedPersonId, onHighlight };

  const peopleContent =
    people.length === 0 ? (
      <div className="flex h-10 items-center justify-center gap-3 px-3 text-sm text-muted-foreground">
        {t("nobodyTagged")}
        {tagging ? (
          <span>· {t("tapFaceToTag")}</span>
        ) : (
          canTag && (
            <button
              type="button"
              onClick={onStartTagging}
              className={cn(glassPill, "h-8 px-3")}
            >
              <UserPlusIcon aria-hidden="true" />
              {t("tagAction")}
            </button>
          )
        )}
      </div>
    ) : wide ? (
      <LightboxPeopleFit {...peopleProps} />
    ) : (
      <LightboxPeopleScroller {...peopleProps} />
    );

  if (!wide) {
    return (
      <div className="relative z-10 shrink-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {peopleContent}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-18 shrink-0 items-center justify-center px-4 pb-2">
      <LightboxStripTabs
        mode={mode}
        onModeChange={onModeChange}
        photoCount={photos.length}
        peopleCount={people.length}
        photosDisabled={tagging}
        panelId={panelId}
        className="absolute top-1/2 left-4 -translate-y-[calc(50%+0.25rem)]"
      />
      <div
        key={mode}
        id={panelId}
        role="tabpanel"
        className="w-full max-w-[calc(100%-22rem)] animate-in duration-base ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
      >
        {mode === "photos" ? (
          <LightboxFilmstrip
            photos={photos}
            index={index}
            onIndexChange={onIndexChange}
            familyId={familyId}
          />
        ) : (
          peopleContent
        )}
      </div>
    </div>
  );
}
