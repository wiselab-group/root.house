import { useTranslations } from "next-intl";
import {
  DownloadIcon,
  ImagesIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { glassIconButton, glassPill } from "@/components/hero/glass";
import {
  ChipArrow,
  moreChipClass,
  personChipClass,
} from "@/components/media/lightbox-person-chip";

/** LightboxStripTabs' tab, as plain markup. */
const TAB =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums text-muted-foreground [&_svg]:size-4";

/** The lightbox's top bar at desktop size (lightbox-top-bar.tsx): «3 / 24»,
 *  the caption, «Отметить людей», download, close. */
export function PhotoLightboxTopBar({
  index,
  total,
  caption,
}: {
  index: number;
  total: number;
  caption: string;
}) {
  const t = useTranslations("media");
  return (
    <div className="relative z-20 flex h-16 shrink-0 items-center gap-3 px-4">
      <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
        <span className="text-foreground">{index}</span> / {total}
      </p>
      <span className="h-5 w-px shrink-0 bg-glass-edge" />
      <span className="block min-w-0 flex-1 truncate font-heading text-lg text-foreground">
        {caption}
      </span>
      <span className={glassPill}>
        <UserPlusIcon />
        {t("tagPeople")}
      </span>
      <span className={glassIconButton}>
        <DownloadIcon />
      </span>
      <span className={glassIconButton}>
        <XIcon />
      </span>
    </div>
  );
}

/** The bottom strip on the «who's on the photo» tab (lightbox-strip.tsx +
 *  LightboxPeopleFit): the photos ⇄ people switch with its counts, and
 *  the name chips — `lit` is the one being hovered, the rest behind «+N». */
export function PhotoLightboxStrip({
  photoCount,
  names,
  lit,
  more,
}: {
  photoCount: number;
  names: readonly string[];
  lit: number;
  more: number;
}) {
  return (
    <div className="relative z-10 flex h-18 shrink-0 items-center justify-center px-4 pb-2">
      <div className="absolute top-1/2 left-4 flex -translate-y-[calc(50%+0.25rem)] rounded-full border border-glass-edge bg-glass p-0.5 backdrop-blur-xl">
        <span className={TAB}>
          <ImagesIcon />
          {photoCount}
        </span>
        <span className={cn(TAB, "bg-glass-strong text-foreground")}>
          <UsersIcon />
          {names.length + more}
        </span>
      </div>
      <div className="flex w-full max-w-[calc(100%-22rem)] justify-center gap-1.5">
        {names.map((name, index) => (
          <span
            key={name}
            className={cn(personChipClass, index === lit && "bg-glass-strong")}
          >
            {name}
            <ChipArrow lit={index === lit} />
          </span>
        ))}
        {more > 0 && <span className={moreChipClass}>+{more}</span>}
      </div>
    </div>
  );
}
