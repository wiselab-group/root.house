import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { Play } from "lucide-react";
import { GlassPill, PanelFrame } from "./panel-frame";

const PEOPLE = ["vera", "ivan", "paul"] as const;

/** A story page: serif title, «Слушать» and who told it, a drop-capped
 *  first paragraph, and the people it's linked to. */
export function StoryPanel() {
  const t = useTranslations("landing");
  const family = useDemoFamily();
  const firstName = (id: (typeof PEOPLE)[number]) =>
    family[id].name.split(" ")[0];
  return (
    <PanelFrame className="flex flex-col justify-center gap-[5%] px-[10%]">
      <span className="text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] tracking-[0.14em] text-primary uppercase">
        {t("panel.story")}
      </span>
      <p className="font-heading text-[clamp(1.25rem,0.6rem+4cqw,2.5rem)] leading-tight font-medium">
        {t("panel.storyTitle")}
      </p>
      <p className="flex items-center gap-3 text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] text-muted-foreground">
        <GlassPill>
          <Play className="size-[1em] fill-current" /> {t("panel.listen")}
        </GlassPill>
        {t("panel.storyMeta")}
      </p>
      <p className="text-[clamp(0.6875rem,0.5rem+1.05cqw,1rem)] leading-relaxed text-foreground/90 first-letter:float-left first-letter:mr-[0.12em] first-letter:font-heading first-letter:text-[3.2em] first-letter:leading-[0.8] first-letter:text-primary">
        {t("panel.storyBody")}
      </p>
      <div className="flex flex-wrap gap-2">
        {PEOPLE.map((id) => (
          <GlassPill key={id}>
            <span className="flex size-[1.4em] items-center justify-center rounded-full bg-branch text-[0.8em]">
              {firstName(id)[0]}
            </span>
            {firstName(id)}
          </GlassPill>
        ))}
      </div>
    </PanelFrame>
  );
}
