import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { type DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { GlassPill, PanelFrame } from "./panel-frame";

/** You → your mother → her parents → her brother, left to right. */
const PATH: readonly DemoPersonId[] = ["owen", "margaret", "vera", "paul"];
const STEP_LABELS = ["mother", "herMother", "herSon"] as const;

/** Relationship trace between two people (the tree's «Родство» panel):
 *  the path drawn in terracotta through everyone in between, ends
 *  selected, and the answer in words. */
export function KinshipPanel() {
  const t = useTranslations("landing");
  const family = useDemoFamily();
  return (
    <PanelFrame className="flex flex-col items-center justify-center gap-[10%] bg-tree-canvas">
      <div className="relative flex w-full items-start justify-between">
        <div className="absolute inset-x-[12%] top-[31%] h-[3px] rounded-full bg-primary" />
        {PATH.map((id, index) => (
          <div key={id} className="relative w-[20%]">
            <MiniPersonCard
              {...family[id]}
              active={index === 0 || index === PATH.length - 1}
            />
            {index < STEP_LABELS.length && (
              <span className="absolute top-[12%] left-[116%] -translate-x-1/2 rounded-full bg-tree-canvas px-1 text-[clamp(0.5625rem,0.4rem+0.8cqw,0.75rem)] whitespace-nowrap text-primary">
                {t(`panel.${STEP_LABELS[index]}`)}
              </span>
            )}
          </div>
        ))}
      </div>
      <GlassPill className="text-[clamp(0.75rem,0.5rem+1.3cqw,1.0625rem)]">
        {t("panel.uncle")}
      </GlassPill>
    </PanelFrame>
  );
}
