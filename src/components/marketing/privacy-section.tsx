import { Lock, Users, MailPlus } from "lucide-react";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { PrivacyFeatureCard } from "@/components/marketing/privacy-feature-card";

/** Only real, documented capabilities (docs/architecture.md § Roles,
 *  Privacy, Invitations) — no invented security claims. */
const CARDS = [
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Every family archive is its own private space. Nothing is public unless someone explicitly makes it so.",
  },
  {
    icon: Users,
    title: "Roles that make sense",
    description:
      "Owners, editors, contributors, and viewers — everyone gets exactly the access they need, nothing more.",
  },
  {
    icon: MailPlus,
    title: "Invite-only",
    description:
      "Bring family in with a real invitation — by email or a private link — never an open sign-up.",
  },
];

export function PrivacySection() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <MarketingSectionHeading title="Your family's story stays your family's." />
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {CARDS.map((card) => (
            <PrivacyFeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
