import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import type { StoryFragment } from "./fragments.data";

const LABEL =
  "text-[clamp(0.5625rem,0.3rem+0.8cqw,0.6875rem)] tracking-[0.12em] uppercase";
const TEXT = "text-[clamp(0.6875rem,0.35rem+1.1cqw,0.9375rem)] leading-snug";

/**
 * One loose piece of the family's story — a chat message, a print, a note.
 * Position, tilt, shrink and fade come from marketing.css .gather-fragment,
 * driven by one number `t` (0 scattered → 1 gathered).
 */
export function FragmentView({
  fragment,
  t,
}: {
  fragment: StoryFragment;
  t: number;
}) {
  const tl = useTranslations("landing.problem.sources");
  const { id, look, desktop, mobile } = fragment;
  const style = {
    "--t": t,
    "--fx-d": desktop.x,
    "--fy-d": desktop.y,
    "--fr-d": desktop.r,
    "--fx-m": mobile.x,
    "--fy-m": mobile.y,
    "--fr-m": mobile.r,
  } as CSSProperties;

  const isScreen = look === "screen";
  return (
    <div
      className={cn(
        "gather-fragment absolute top-0 left-0 flex flex-col gap-[0.4em] p-[0.9em] shadow-lg will-change-transform",
        isScreen
          ? "rounded-2xl border border-border bg-card text-card-foreground"
          : "rounded-[3px] bg-paper text-paper-ink",
      )}
      style={style}
    >
      <span
        className={cn(LABEL, isScreen ? "text-muted-foreground" : "opacity-70")}
      >
        {tl(`${id}.label`)}
      </span>
      {look === "photo" && (
        <span className="flex aspect-[4/3] items-end justify-center overflow-hidden rounded-[2px] bg-paper-ink/12">
          <PortraitSilhouette className="w-[55%] text-paper-ink/50" />
        </span>
      )}
      <span
        className={cn(
          TEXT,
          isScreen
            ? "rounded-xl bg-secondary px-[0.7em] py-[0.45em]"
            : "font-heading italic",
        )}
      >
        {tl(`${id}.text`)}
      </span>
    </div>
  );
}
