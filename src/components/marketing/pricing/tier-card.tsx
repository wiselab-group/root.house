import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/link-button";
import { SoonBadge } from "@/components/marketing/shared/soon-badge";
import type { Tier } from "./tiers.data";

/** One plan: name and price, what it's for, what's in it. Every plan
 *  starts the same way — a free archive — since there's no billing yet. */
export function TierCard({ tier }: { tier: Tier }) {
  const t = useTranslations("landing");
  const name = (id: Tier["id"]) => t(`pricing.tiers.${id}.name`);
  const isFree = tier.id === "free";
  return (
    <article
      className={cn(
        "relative flex flex-col gap-6 rounded-3xl border bg-card p-6 sm:p-7",
        tier.recommended
          ? "border-primary shadow-xl ring-1 ring-primary/30"
          : "border-border",
      )}
    >
      {tier.recommended && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          {t("pricing.recommended")}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-xl font-medium">{name(tier.id)}</h3>
        <p className="text-sm text-muted-foreground">
          {t(`pricing.tiers.${tier.id}.tagline`)}
        </p>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-medium tabular-nums">
            {t(`pricing.tiers.${tier.id}.price`)}
          </span>
          {!isFree && (
            <span className="text-sm text-muted-foreground">
              {t("pricing.perYear")}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {tier.includes && (
          <p className="text-sm font-medium text-foreground">
            {t("pricing.everythingIn", { tier: name(tier.includes) })}
          </p>
        )}
        <ul className="flex flex-col gap-2.5 text-sm">
          {tier.features.map(({ key, soon }) => (
            <li key={key} className="flex items-start gap-2.5">
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  soon ? "text-muted-foreground/50" : "text-tree-accent",
                )}
                aria-hidden="true"
              />
              <span
                className={soon ? "text-muted-foreground" : "text-foreground"}
              >
                {t(`pricing.features.${key}`)}
              </span>
              {soon && <SoonBadge className="ml-auto" />}
            </li>
          ))}
        </ul>
      </div>
      <LinkButton
        href="/register"
        size="lg"
        variant={tier.recommended ? "default" : "outline"}
        className="mt-auto"
      >
        {t("ctaButton")}
      </LinkButton>
    </article>
  );
}
