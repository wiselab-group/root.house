import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

const FACES: readonly DemoPersonId[] = [
  "ivan",
  "vera",
  "margaret",
  "owen",
  "lily",
];

/**
 * Where the scattered fragments end up: one family story with its people,
 * in the middle of the stage. `shown` (0..1) is its scroll-driven entrance.
 */
export function GatheredStoryCard({ shown }: { shown: number }) {
  const t = useTranslations("landing.problem");
  const family = useDemoFamily();
  return (
    <div className="absolute top-[60cqw] left-1/2 w-[78cqw] -translate-1/2 sm:top-[31.25cqw] sm:w-[44cqw]">
      <div style={{ opacity: shown, transform: `scale(${0.9 + 0.1 * shown})` }}>
        <div className="flex flex-col items-center gap-[0.6em] rounded-[1.25rem] border border-border bg-card px-[1.4em] py-[1.3em] text-center shadow-xl text-[clamp(0.75rem,0.4rem+1.2cqw,1rem)]">
          <span className="text-[0.75em] tracking-[0.14em] text-primary uppercase">
            {t("cardEyebrow")}
          </span>
          <span className="font-heading text-[1.6em] leading-tight font-medium">
            {t("cardTitle")}
          </span>
          <span className="flex -space-x-[0.4em] py-[0.2em]">
            {FACES.map((id) => (
              <span
                key={id}
                className="flex size-[2.2em] items-center justify-center rounded-full border-2 border-card bg-accent text-[0.8em] font-medium text-accent-foreground"
              >
                {family[id].name[0]}
              </span>
            ))}
          </span>
          <span className="text-muted-foreground">{t("cardMeta")}</span>
          <span className="text-[0.85em] text-muted-foreground/80">
            {t("cardKinds")}
          </span>
        </div>
      </div>
    </div>
  );
}
