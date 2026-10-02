import { useTranslations } from "next-intl";
import { BookOpen, Users } from "lucide-react";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { delay } from "@/components/marketing/shared/delay";
import { SoonBadge } from "@/components/marketing/shared/soon-badge";

const CARD = "flex flex-col gap-4 rounded-3xl border border-border bg-card p-5";

/** What the recording becomes: Ivan, with his family and the story. */
export function VoicePersonCard() {
  const t = useTranslations("landing.voice");
  const family = useDemoFamily();
  const rows = [
    {
      icon: Users,
      label: t("familyLabel"),
      lines: [t("spouse"), t("children")],
    },
    { icon: BookOpen, label: t("storyLabel"), lines: [t("storyTitle")] },
  ];
  return (
    <div data-reveal="" className={CARD} style={delay(1700)}>
      <div className="flex items-center gap-4">
        <div className="@container w-14 shrink-0">
          <MiniPersonCard name={family.ivan.name} labelled={false} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-heading text-xl font-medium">
            {family.ivan.name}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("personBorn")}
          </span>
        </div>
        <SoonBadge className="ml-auto self-start" />
      </div>
      {rows.map(({ icon: Icon, label, lines }, index) => (
        <div
          key={label}
          data-reveal=""
          className="flex gap-3 border-t border-border pt-3 text-sm"
          style={delay(2100 + index * 300)}
        >
          <Icon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {label}
            </span>
            {lines.map((line) => (
              <span key={line} className="text-foreground">
                {line}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The gaps in the story, as questions someone in the family could answer. */
export function VoiceMissingCard() {
  const t = useTranslations("landing.voice");
  const questions = [t("q1"), t("q2"), t("q3")];
  return (
    <div data-reveal="" className={CARD} style={delay(3200)}>
      <div className="flex items-start gap-3">
        <span className="font-heading text-lg leading-snug font-medium">
          {t("missingTitle")}
        </span>
        <SoonBadge className="ml-auto" />
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {questions.map((question, index) => (
          <li
            key={question}
            data-reveal=""
            className="flex gap-2.5 rounded-xl bg-secondary/60 px-3 py-2.5"
            style={delay(3500 + index * 250)}
          >
            <span aria-hidden="true" className="text-primary">
              ?
            </span>
            {question}
          </li>
        ))}
      </ul>
      <span
        aria-hidden="true"
        className="nudge w-fit rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground"
        style={delay(4400)}
      >
        {t("addInfo")} →
      </span>
    </div>
  );
}
