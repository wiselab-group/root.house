import { LinkButton } from "@/components/ui/link-button";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";

const STEPS = [
  {
    title: "Add yourself",
    body: "Your name and year of birth. That's the whole first step.",
  },
  {
    title: "Add your parents",
    body: "The tree starts to take shape the moment there's a second generation.",
  },
  {
    title: "Keep one memory",
    body: "A photo, a date, a sentence someone once told you.",
  },
  {
    title: "Invite someone who remembers",
    body: "They fill in what you don't know — the tree grows from both ends.",
  },
];

/**
 * "Start with one person" — the lowest possible first step, as a single
 * vertical thread instead of rows of icons. Also carries the old
 * generational-value message (grandparents / parents / you) in its subcopy.
 */
export function StartWithOnePersonSection() {
  return (
    <section aria-labelledby="start-title" className="px-6 py-section">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-8">
          <MarketingSectionHeading
            id="start-title"
            align="left"
            eyebrow="Ten minutes to begin"
            title="Start with one person."
            subcopy="You don't need the whole tree on day one. Grandparents remember the beginning, parents fill in the middle — you only have to start."
          />
          <LinkButton href="/register" size="lg">
            Start your family story →
          </LinkButton>
        </div>
        <ol className="relative flex flex-col gap-8 border-l border-border pl-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-1">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-9.25 size-2.5 rounded-full border-[1.5px] border-muted-foreground bg-background"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-heading text-xl">{step.title}</span>
              <span className="text-muted-foreground">{step.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
