"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontalIcon, PinIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VoiceClipSource } from "@/components/story/listen/listening-store";
import { VoicePlayRing } from "./voice-play-ring";
import { VoiceWaveform } from "./voice-waveform";
import { useVoicePlayback } from "./use-voice-playback";
import { voiceClock } from "./voice-wording";

const quiet =
  "cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * One recording in the profile's «Записи голоса» list (mock «B»): play,
 * its name, date and length, its waveform — and, for whoever may, «⋯»
 * with «Показывать в шапке» and «Удалить» (asked once more, inline).
 */
export function VoiceRow({
  source,
  title,
  date,
  length,
  peaks,
  isMain,
  busy,
  onFeature,
  onDelete,
}: {
  source: VoiceClipSource;
  title: string;
  date: string | null;
  length: string;
  peaks: number[] | null;
  isMain: boolean;
  busy: boolean;
  onFeature: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const t = useTranslations("voice");
  const tc = useTranslations("common");
  const [asking, setAsking] = useState(false);
  const { status, progress, remaining, toggle } = useVoicePlayback(source);
  const playing = status === "playing";

  return (
    <li className="flex flex-col gap-2 rounded-xl px-2 py-2.5 transition-colors duration-fast hover:bg-foreground/5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? t("pause", { title }) : t("play", { title })}
          className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <VoicePlayRing
            playing={playing}
            progress={progress}
            className="size-10"
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {isMain && `${t("main")} · `}
            {date && `${date} · `}
            {status === "idle" ? length : voiceClock(remaining)}
          </span>
        </div>
        {(onFeature || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={busy}
              render={
                <button
                  type="button"
                  aria-label={t("actions")}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-foreground/10 [&_svg]:size-4"
                />
              }
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 min-w-52">
              {onFeature && (
                <DropdownMenuItem onClick={onFeature}>
                  <PinIcon />
                  {t("makeMain")}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setAsking(true)}
                >
                  <Trash2Icon />
                  {t("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {peaks && (
        <VoiceWaveform
          peaks={peaks}
          progress={progress}
          className="h-6 pl-[3.25rem]"
        />
      )}
      {asking && onDelete && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 pl-[3.25rem] text-xs"
        >
          <span className="text-muted-foreground">{t("deleteAsk")}</span>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className={`${quiet} bg-destructive/15 text-destructive`}
          >
            {t("delete")}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className={`${quiet} hover:bg-foreground/10`}
          >
            {tc("cancel")}
          </button>
        </div>
      )}
    </li>
  );
}
