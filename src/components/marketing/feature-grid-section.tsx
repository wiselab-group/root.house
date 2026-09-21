import {
  TreeDeciduous,
  UserRound,
  BookOpen,
  Images,
  History,
  GitBranch,
  Search,
  Users,
  Lock,
} from "lucide-react";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { FeatureGridItem } from "@/components/marketing/feature-grid-item";

/** Video/Voice/Documents deliberately omitted rather than "coming soon"
 *  tagged — see plan: omission is more honest than implying a committed
 *  roadmap date. */
const FEATURES = [
  {
    icon: TreeDeciduous,
    label: "Family Tree",
    description: "Interactive, grows as you add people.",
  },
  {
    icon: UserRound,
    label: "People Profiles",
    description: "More than a name and two dates.",
  },
  {
    icon: BookOpen,
    label: "Stories",
    description: "Write down what you remember.",
  },
  {
    icon: Images,
    label: "Photos",
    description: "Attached to the people in them.",
  },
  {
    icon: History,
    label: "Timeline",
    description: "The events that shaped a life.",
  },
  {
    icon: GitBranch,
    label: "Relationships",
    description: "Parents, partners, siblings, in-laws.",
  },
  {
    icon: Search,
    label: "Search",
    description: "Find anyone across the archive.",
  },
  {
    icon: Users,
    label: "Collaboration",
    description: "Everyone adds their own piece.",
  },
  {
    icon: Lock,
    label: "Private Family Space",
    description: "Invite-only, never public by default.",
  },
];

export function FeatureGridSection() {
  return (
    <section className="bg-muted/40 px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <MarketingSectionHeading title="Everything your family's story needs." />
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureGridItem key={feature.label} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
