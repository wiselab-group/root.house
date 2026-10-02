import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";
import { delay } from "@/components/marketing/shared/delay";

/** Bar heights of the waveform, % of its track. */
const WAVE = [
  38, 62, 84, 56, 92, 70, 44, 78, 100, 66, 48, 82, 58, 36, 72, 90, 54, 40, 68,
  50,
];

/**
 * A recording in progress — the waveform breathes (marketing.css .wave-bar)
 * and what's being said appears beneath it, hesitations and all.
 */
export function VoiceRecorder() {
  const t = useTranslations("landing.voice");
  return (
    <div
      data-reveal=""
      className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mic className="size-4.5" aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {t("recorderLabel")}
          </span>
          <span className="text-sm text-foreground">{t("recorderWho")}</span>
        </span>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {t("duration")}
        </span>
      </div>
      <div aria-hidden="true" className="flex h-12 items-center gap-[3px]">
        {WAVE.map((height, index) => (
          <span
            key={index}
            className="wave-bar w-full origin-center rounded-full bg-branch"
            style={{ height: `${height}%`, ...delay((index % 7) * 140) }}
          />
        ))}
      </div>
      <p
        data-reveal=""
        className="font-heading text-lg leading-relaxed italic"
        style={delay(500)}
      >
        {t("transcript")}
      </p>
    </div>
  );
}
