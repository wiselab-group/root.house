import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";

export function PricingTierCard({
  name,
  price,
  cadence,
  description,
  features,
  recommended = false,
}: {
  name: string;
  price: string;
  cadence?: string;
  description?: string;
  features: readonly string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-2xl border bg-card p-6",
        recommended ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-medium">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <p className="mt-2 text-3xl font-medium">
          {price}
          {cadence && (
            <span className="text-sm font-normal text-muted-foreground">
              /{cadence}
            </span>
          )}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
              strokeWidth={2}
            />
            <span className="text-foreground/90">{feature}</span>
          </li>
        ))}
      </ul>
      <LinkButton
        href="/register"
        variant={recommended ? "default" : "outline"}
        className="mt-auto"
      >
        Get started
      </LinkButton>
    </div>
  );
}
