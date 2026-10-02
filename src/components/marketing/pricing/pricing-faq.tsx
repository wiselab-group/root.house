import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const ITEMS = ["who", "export", "elders", "start"] as const;

/** The doubts right before signing up, as native disclosures — keyboard
 *  and screen-reader friendly with no script. */
export function PricingFaq() {
  const t = useTranslations("landing.faq");
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 lg:grid-cols-[1fr_2fr]">
      <h3 className="font-heading text-heading font-medium">{t("title")}</h3>
      <div className="flex flex-col border-t border-border">
        {ITEMS.map((id) => (
          <details key={id} className="group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="font-medium">{t(`items.${id}.q`)}</span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-base ease-(--ease-reveal) group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-5 text-sm text-muted-foreground">
              {t(`items.${id}.a`)}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
