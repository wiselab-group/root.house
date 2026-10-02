import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { TogetherFeed } from "./together-feed";
import { MembersCard } from "./members-card";
import { PrivacyFacts } from "./privacy-facts";

/**
 * 06 — Why involve my family, and who owns it? Relatives each add what
 * they remember (the family feed — the app's real activity log, not live
 * co-editing), and the archive stays the family's: members by invitation,
 * a role each, private by default. Only real, documented capabilities
 * (docs/architecture.md § Roles, Privacy, Invitations; share links).
 */
export function TogetherSection() {
  const t = useTranslations("landing.together");
  return (
    <section
      aria-labelledby="together-title"
      className="px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:gap-16">
        <MarketingSectionHeading
          id="together-title"
          title={t("title")}
          subcopy={t("lead")}
        />
        <Reveal className="grid items-start gap-6 md:grid-cols-2 md:gap-8 lg:mx-auto lg:w-full lg:max-w-4xl">
          <TogetherFeed />
          <MembersCard />
        </Reveal>
        <PrivacyFacts />
      </div>
    </section>
  );
}
