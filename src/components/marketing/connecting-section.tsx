import { UserPlus, Image as ImageIcon, GitBranch, Mail } from "lucide-react";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";

const STEPS = [
  { icon: UserPlus, label: "Start with a person" },
  { icon: ImageIcon, label: "Add a memory" },
  { icon: GitBranch, label: "Discover a connection" },
  { icon: Mail, label: "Invite someone who remembers" },
];

/** Explicitly ties the three hero-carousel entry points back into one
 *  mental model — not three separate products. */
export function ConnectingSection() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
        <MarketingSectionHeading title="One place for your family story." />
        <ol className="grid w-full grid-cols-1 gap-6 sm:grid-cols-4">
          {STEPS.map(({ icon: Icon, label }, index) => (
            <li
              key={label}
              className="flex flex-col items-center gap-3 text-center animate-content-enter"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon
                  className="size-5"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
