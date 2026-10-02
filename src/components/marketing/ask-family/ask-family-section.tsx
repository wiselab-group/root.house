import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { SoonBadge } from "@/components/marketing/shared/soon-badge";
import { AskFamilyProfile } from "./ask-family-profile";
import { AskFamilyThread } from "./ask-family-thread";

/**
 * 07 — How do missing details get filled? A great-grandmother with gaps
 * in her page, a question to the one person who might know, her answer
 * landing in the story. Not built yet — badged as such.
 */
export function AskFamilySection() {
  const t = useTranslations("landing");
  return (
    <section aria-labelledby="ask-title" className="px-4 py-section sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="flex flex-col items-center gap-4">
          <SoonBadge />
          <MarketingSectionHeading
            id="ask-title"
            title={t("ask.title")}
            subcopy={t("ask.lead")}
          />
        </div>
        <Reveal
          threshold={0.35}
          className="mx-auto grid w-full max-w-4xl items-start gap-6 md:grid-cols-[1fr_1.15fr] md:gap-8"
        >
          <AskFamilyProfile />
          <AskFamilyThread />
        </Reveal>
      </div>
    </section>
  );
}
