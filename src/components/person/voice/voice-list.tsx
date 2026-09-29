"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { glassChip, glassIconButton } from "@/components/hero/glass";
import type { VoiceClipSource } from "@/components/story/listen/listening-store";
import { VoiceRow } from "./voice-row";

export interface VoiceListItem {
  key: string;
  source: VoiceClipSource;
  title: string;
  date: string | null;
  length: string;
  peaks: number[] | null;
  isMain: boolean;
  onFeature: (() => void) | null;
  onDelete: (() => void) | null;
}

/**
 * Every recording on the profile, opened from beside the hero capsule —
 * «Ещё 3 записи» when there are more, a quiet «⋯» when the capsule's is
 * the only one (then it's just for managing it or adding another). A
 * popover, not a new band on the page: the hero keeps its height.
 */
export function VoiceList({
  items,
  busy,
  onAdd,
}: {
  items: VoiceListItem[];
  busy: boolean;
  onAdd: (() => void) | null;
}) {
  const t = useTranslations("voice");
  const more = items.length - 1;

  return (
    <Popover>
      <PopoverTrigger
        render={
          more > 0 ? (
            <button
              type="button"
              className={`${glassChip} h-9 cursor-pointer px-3.5 text-sm transition-colors duration-fast outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-background/70`}
            />
          ) : (
            <button
              type="button"
              aria-label={t("manage")}
              className={`${glassIconButton} data-popup-open:bg-background/70`}
            />
          )
        }
      >
        {more > 0 ? (
          t("more", { count: more })
        ) : (
          <MoreHorizontalIcon aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[min(70svh,32rem)] w-[min(24rem,calc(100vw-2rem))] flex-col gap-1 overflow-y-auto rounded-2xl p-2"
      >
        <h2 className="px-2 pt-1 pb-1.5 font-heading text-lg">
          {t("listTitle")}
        </h2>
        <ul className="flex flex-col">
          {items.map(({ key, ...item }) => (
            <VoiceRow key={key} {...item} busy={busy} />
          ))}
        </ul>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-primary outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
          >
            <PlusIcon aria-hidden="true" />
            {t("addMore")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
