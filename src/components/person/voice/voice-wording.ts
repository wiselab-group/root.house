"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PersonVoiceView } from "@/domain/person-voice/person-voice.service";
import { formatPartialDate } from "@/domain/shared/partial-date";

export const voiceClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
};

/**
 * How a recording is named on the profile: its own title, else «Голос» for
 * the person's own voice (the page already says whose) or «Рассказывает
 * Галина» for someone telling about them — never a name in a grammatical
 * case we can't decline. The line under it: when it was recorded, if
 * known, and how long it is.
 */
export function useVoiceWording() {
  const t = useTranslations("voice");
  const locale = useLocale();
  return (voice: PersonVoiceView) => {
    const title =
      voice.title ??
      (voice.speaker === "narrator" && voice.narratorName
        ? t("titleNarrator", { name: voice.narratorName })
        : t("titleSelf"));
    const date = voice.recordedDate?.year
      ? formatPartialDate(voice.recordedDate, locale)
      : null;
    return { title, date, length: voiceClock(voice.durationMs / 1000) };
  };
}
