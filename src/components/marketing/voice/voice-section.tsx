import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";
import { DemoNote } from "@/components/marketing/shared/soon-badge";
import { VoiceRecorder } from "./voice-recorder";
import { VoicePersonCard, VoiceMissingCard } from "./voice-structured";

function Arrow({ at }: { at: number }) {
  return (
    <span
      aria-hidden="true"
      data-reveal=""
      className="flex justify-center text-muted-foreground lg:pt-24"
      style={delay(at)}
    >
      <ArrowRight className="size-5 max-lg:rotate-90" strokeWidth={1.5} />
    </span>
  );
}

/**
 * 04 — How easy is it to add stories? Say it the way you remember it: a
 * recording on the left becomes a person with family and a story, and the
 * gaps become questions. Recording is real today; turning it into facts is
 * not yet — the page says so right under the demo.
 */
export function VoiceSection() {
  const t = useTranslations("landing");
  return (
    <section
      id="voice"
      aria-labelledby="voice-title"
      className="scroll-mt-8 px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <MarketingSectionHeading
          id="voice-title"
          title={t("voice.title")}
          subcopy={t("voice.lead")}
        />
        <Reveal
          threshold={0.2}
          className="grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-5"
        >
          <VoiceRecorder />
          <Arrow at={1400} />
          <VoicePersonCard />
          <Arrow at={2900} />
          <VoiceMissingCard />
        </Reveal>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="font-heading text-heading font-medium text-balance">
            {t("voice.closing")}
          </p>
          <div className="flex flex-col gap-2 text-left">
            <DemoNote>{t("voice.nowReal")}</DemoNote>
            <DemoNote soon>{t("voice.soonNote")}</DemoNote>
          </div>
          <LinkButton href="/register" size="lg">
            {t("ctaButton")}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
