import { User, Users, Image as ImageIcon, Mail } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";

const STEPS = [
  { icon: User, label: "You" },
  { icon: Users, label: "Parents" },
  { icon: ImageIcon, label: "One memory" },
  { icon: Mail, label: "Invite family" },
];

export function StartWithOnePersonSection() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
        <MarketingSectionHeading
          title="Start with one person."
          subcopy="You don't need the whole family tree on day one. Add yourself, add your parents, write down one memory — then invite the relative who'll fill in the rest."
        />
        <div className="flex items-center gap-3 sm:gap-5">
          {STEPS.map(({ icon: Icon, label }, index) => (
            <div key={label} className="flex items-center gap-3 sm:gap-5">
              <div className="flex flex-col items-center gap-2">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon
                    className="size-4.5"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span className="text-muted-foreground/50" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <LinkButton href="/register" size="lg">
          Start your family story →
        </LinkButton>
      </div>
    </section>
  );
}
