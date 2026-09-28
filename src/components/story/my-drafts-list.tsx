import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { PencilLineIcon } from "lucide-react";
import type { StoryRecord } from "@/domain/story/story.service";
import { storyPreviewText } from "@/domain/story/story-layout";

const PREVIEW_LENGTH = 140;

/**
 * «Мои черновики» on /stories — the viewer's own unpublished stories, shown
 * only to them (no one else can see a draft anywhere). Quieter than the
 * published feed below it: a dashed frame, no people/privacy details — each
 * row just says which story it is and when it was last touched, and opens
 * the editor to carry on.
 */
export function MyDraftsList({
  familySlug,
  drafts,
}: {
  familySlug: string;
  drafts: StoryRecord[];
}) {
  const t = useTranslations("stories");
  const format = useFormatter();
  return (
    <section
      aria-labelledby="my-drafts"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 sm:p-5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="my-drafts" className="font-heading text-lg font-medium">
          {t("myDrafts")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("myDraftsHint")}</p>
      </div>
      <ul className="flex flex-col">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link
              href={`/families/${familySlug}/stories/${draft.slug}/edit`}
              className="group/row -mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-base ease-(--ease-reveal) hover:bg-glass-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <PencilLineIcon
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-primary"
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={`truncate font-medium transition-colors group-hover/row:text-primary ${draft.title ? "" : "text-muted-foreground italic"}`}
                >
                  {draft.title || t("untitled")}
                </span>
                {draft.body && (
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {storyPreviewText(draft.body).slice(0, PREVIEW_LENGTH)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/80">
                  {t("draftEdited", {
                    date: format.dateTime(draft.updatedAt, "long"),
                  })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
