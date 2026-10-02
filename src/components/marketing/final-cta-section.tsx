import Link from "next/link";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";

const LINES = ["line1", "line2", "line3"] as const;

/** 10 — What do I do now? The smallest possible first step, the same
 *  action as the hero, and the brand's promise to close the page. */
export function FinalCtaSection() {
  const t = useTranslations("landing");
  return (
    <section
      aria-labelledby="final-cta-title"
      className="px-4 py-section sm:px-6"
    >
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <h2
          id="final-cta-title"
          className="font-heading text-display font-medium text-balance"
        >
          {t("final.title")}
        </h2>
        <p className="flex flex-col gap-1 text-muted-foreground sm:text-lg">
          {LINES.map((key, index) => (
            <span key={key} data-reveal="" style={delay(150 + index * 200)}>
              {t(`final.${key}`)}
            </span>
          ))}
        </p>
        <div className="flex flex-col items-center gap-3">
          <LinkButton href="/register" size="lg">
            {t("ctaButton")}
          </LinkButton>
          <span className="text-sm text-muted-foreground">
            {t("final.haveArchive")}{" "}
            <Link
              href="/login"
              className="rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("nav.logIn")}
            </Link>
          </span>
        </div>
        <p className="pt-10 font-heading text-hero font-medium text-balance italic">
          {t("brandStatement")}
        </p>
      </Reveal>
    </section>
  );
}
