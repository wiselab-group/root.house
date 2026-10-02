import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { delay } from "@/components/marketing/shared/delay";

/** Who added what, newest last — each entry arrives a beat after the one
 *  before once the block is seen. */
const ENTRIES = ["margaret", "paul", "lily", "owen"] as const;
const STAGGER = 450;

/** The family feed (the app's activity log): relatives adding what they
 *  remember to the same story. */
export function TogetherFeed() {
  const t = useTranslations("landing.together");
  const family = useDemoFamily();
  return (
    <div className="flex flex-col gap-3 md:pt-1">
      <h3 className="px-1 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {t("feedTitle")}
      </h3>
      <ol className="flex flex-col gap-2">
        {ENTRIES.map((who, index) => (
          <li
            key={who}
            data-reveal=""
            className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3"
            style={delay(200 + index * STAGGER)}
          >
            <span
              aria-hidden="true"
              className={
                who === "owen"
                  ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
                  : "flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
              }
            >
              {family[who].name[0]}
            </span>
            <span className="flex flex-col text-sm">
              <span className="font-medium text-foreground">
                {t(`contributions.${who}.who`)}
              </span>
              <span className="text-muted-foreground">
                {t(`contributions.${who}.did`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
