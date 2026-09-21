import { cn } from "@/lib/utils";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";

const GENERATIONS = ["Grandparents", "Parents", "You", "Children"];

/** CSS-only diagram — neutral tokens throughout, with a --primary ring on
 *  the "You" node only (the visitor's own position, not a tree, so
 *  --tree-accent/--branch stay out per DESIGN.md's hue-separation rule). */
export function GenerationalValueSection() {
  return (
    <section className="bg-muted/40 px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10">
        <MarketingSectionHeading
          title="It becomes more valuable with every generation."
          subcopy="Grandparents remember the beginning. Parents fill in the middle. You're writing the next chapter — and one day, your children will thank you for starting it."
        />
        <div className="flex w-full items-center justify-between gap-2">
          {GENERATIONS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full border bg-card text-sm font-medium",
                    label === "You"
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border",
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-center text-xs text-muted-foreground sm:text-sm">
                  {label}
                </span>
              </div>
              {index < GENERATIONS.length - 1 && (
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
