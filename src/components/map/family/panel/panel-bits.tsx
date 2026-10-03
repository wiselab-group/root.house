"use client";

import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "lucide-react";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { MapPerson } from "@/domain/place/place-map.service";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("familyMap");
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1.5 flex h-8 w-fit cursor-pointer items-center gap-0.5 rounded-full pr-2.5 pl-1 text-sm font-medium text-muted-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      {t("back")}
    </button>
  );
}

/** Round portrait in the identity sage ring — initials until a photo loads. */
export function MapAvatar({
  person,
  familyId,
  size = "sm",
}: {
  person: MapPerson;
  familyId: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-tree-accent bg-muted font-semibold text-muted-foreground",
        size === "sm" ? "size-8 text-[0.625rem]" : "size-14 text-sm",
      )}
    >
      {person.photoMediaId ? (
        <ArchiveImage
          src={mediaUrl(person.photoMediaId, familyId, "thumb")}
          alt=""
          fill
          sizes={size === "sm" ? "32px" : "56px"}
          className="object-cover"
        />
      ) : (
        person.initials
      )}
    </span>
  );
}

/** A person in a panel list — opens their path on the map. */
export function PersonRow({
  person,
  familyId,
  aside,
  sub,
  muted,
  leading,
  onSelect,
}: {
  person: MapPerson;
  familyId: string;
  /** Before the avatar — e.g. a generation numeral. */
  leading?: React.ReactNode;
  aside?: string;
  sub?: string;
  muted?: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 py-1 text-left transition-[background-color,opacity] duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring",
          muted && "opacity-45",
        )}
      >
        {leading}
        <MapAvatar person={person} familyId={familyId} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{person.name}</span>
          {sub && (
            <span className="truncate text-xs text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        {aside && (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {aside}
          </span>
        )}
      </button>
    </li>
  );
}
