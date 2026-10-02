import { useTranslations } from "next-intl";
import { Check, MessageCircle } from "lucide-react";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { delay } from "@/components/marketing/shared/delay";
import { ASK_TIMELINE } from "./ask-timeline";

const FIELDS = [
  { label: "born", value: "bornValue" },
  { label: "place", value: "placeValue" },
  { label: "father", value: null },
] as const;

/** Anna's page with its gaps — two of them fill in once Margaret answers;
 *  her father stays unknown. */
export function AskFamilyProfile() {
  const t = useTranslations("landing.ask");
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className="@container w-14 shrink-0">
          <MiniPersonCard name={t("personName")} labelled={false} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-xl font-medium">
            {t("personName")}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("personRole")}
          </span>
        </div>
      </div>
      <dl className="flex flex-col text-sm">
        {FIELDS.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 border-t border-border py-2.5"
          >
            <dt className="text-muted-foreground">{t(label)}</dt>
            <dd className="inline-grid justify-items-end text-foreground">
              <span
                data-reveal-out={value ? "" : undefined}
                className="col-start-1 row-start-1 text-muted-foreground"
                style={delay(ASK_TIMELINE.filled)}
              >
                {t("unknown")}
              </span>
              {value && (
                <span
                  data-reveal=""
                  className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
                  style={delay(ASK_TIMELINE.filled + 150)}
                >
                  <Check
                    className="size-3.5 text-tree-accent"
                    aria-hidden="true"
                  />
                  {t(value)}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <span
        aria-hidden="true"
        className="nudge inline-flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        style={delay(ASK_TIMELINE.ask)}
      >
        <MessageCircle className="size-4" />
        {t("askButton")}
      </span>
    </div>
  );
}
