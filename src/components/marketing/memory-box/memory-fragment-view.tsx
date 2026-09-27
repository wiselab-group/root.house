import type { CSSProperties } from "react";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { useTranslations } from "next-intl";
import type { MemoryFragment } from "./memory-fragments.data";

/**
 * One memory that travels from the scattered pile into its tree slot.
 * Position, rotation and the paper→card crossfade are all CSS (marketing.css
 * .memory-fragment) driven by one number, `t` — this component only hands
 * over the coordinates for both breakpoints. The person card is in flow and
 * sizes the box; the paper face sits on top of it.
 */
export function MemoryFragmentView({
  fragment,
  t,
}: {
  fragment: MemoryFragment;
  t: number;
}) {
  const tl = useTranslations("landing");
  const family = useDemoFamily();
  const { from, to } = fragment;
  const style = {
    "--t": t,
    "--fx-d": from.desktop.x,
    "--fy-d": from.desktop.y,
    "--fr-d": from.desktop.r ?? 0,
    "--tx-d": to.desktop.x,
    "--ty-d": to.desktop.y,
    "--fx-m": from.mobile.x,
    "--fy-m": from.mobile.y,
    "--fr-m": from.mobile.r ?? 0,
    "--tx-m": to.mobile.x,
    "--ty-m": to.mobile.y,
  } as CSSProperties;

  return (
    <div
      className="memory-fragment absolute top-0 left-0 will-change-transform"
      style={style}
    >
      <div className="memory-card-face">
        <MiniPersonCard {...family[fragment.person]} />
      </div>
      <div className="memory-fragment-face absolute inset-x-0 top-0">
        {fragment.kind === "photo" ? (
          <PaperPhoto caption={tl(`fragments.${fragment.person}`)} />
        ) : (
          <PaperNote text={tl(`fragments.${fragment.person}`)} />
        )}
      </div>
    </div>
  );
}

/** Old print with a white border and a pencilled caption. The paper is the
 *  page's own light --foreground tone, ink its dark --background. */
function PaperPhoto({ caption }: { caption: string }) {
  return (
    <div className="rounded-[4%] bg-foreground p-[7%] pb-[4%] shadow-lg">
      <div className="flex aspect-square items-end justify-center overflow-hidden rounded-[2%] bg-secondary">
        <PortraitSilhouette className="w-[78%] text-muted-foreground/70" />
      </div>
      <p className="mt-[6%] truncate font-heading text-[clamp(0.5625rem,0.3rem+0.8cqw,0.8125rem)] text-background italic">
        {caption}
      </p>
    </div>
  );
}

function PaperNote({ text }: { text: string }) {
  return (
    <div className="flex aspect-[1/0.95] items-center rounded-[4%] bg-foreground p-[10%] shadow-lg">
      <p className="font-heading text-[clamp(0.625rem,0.3rem+1cqw,0.9375rem)] leading-snug text-background italic">
        {text}
      </p>
    </div>
  );
}
