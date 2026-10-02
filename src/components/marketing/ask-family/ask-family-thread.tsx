import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { delay } from "@/components/marketing/shared/delay";
import { ASK_TIMELINE } from "./ask-timeline";

/** The question as it goes to Mom, her reply, and the note that it's now
 *  part of the story. */
export function AskFamilyThread() {
  const t = useTranslations("landing.ask");
  const family = useDemoFamily();
  return (
    <div className="flex flex-col gap-4 md:pt-6">
      <div
        data-reveal=""
        className="flex flex-col items-end gap-1.5 self-end"
        style={delay(ASK_TIMELINE.question)}
      >
        <span className="text-xs text-muted-foreground">{t("to")}</span>
        <p className="max-w-sm rounded-2xl rounded-br-md bg-primary/15 px-4 py-3 text-foreground">
          {t("question")}
        </p>
      </div>
      <div
        data-reveal=""
        className="flex items-end gap-2.5"
        style={delay(ASK_TIMELINE.answer)}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
        >
          {family.margaret.name[0]}
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("answerFrom")}
          </span>
          <p className="max-w-sm rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 font-heading text-lg leading-snug italic">
            {t("answer")}
          </p>
        </div>
      </div>
      <span
        data-reveal=""
        className="ml-10.5 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground"
        style={delay(ASK_TIMELINE.filled)}
      >
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-tree-accent"
        />
        {t("added")}
      </span>
    </div>
  );
}
