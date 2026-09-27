import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";

/** Closing appeal — the "ask them while you still can" feeling the whole
 *  page builds towards, answered with the same first step as the hero. */
export function FinalCtaSection() {
  const t = useTranslations("landing");
  return (
    <section aria-labelledby="final-cta-title" className="px-6 py-section">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2
          id="final-cta-title"
          className="font-heading text-display font-medium text-balance"
        >
          {t("ctaTitle")}
        </h2>
        <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
          {t("ctaBody")}
        </p>
        <LinkButton href="/register" size="lg">
          {t("ctaButton")}
        </LinkButton>
      </div>
    </section>
  );
}
