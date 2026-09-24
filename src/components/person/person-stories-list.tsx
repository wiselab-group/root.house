"use client";

import Link from "next/link";
import { useOptimistic } from "react";
import { ChevronRightIcon, ClockIcon } from "lucide-react";
import { DeleteStoryButton } from "@/components/forms/delete-story-button";
import { layoutStoryBody, readingMinutes } from "@/domain/story/story-layout";
import { glassSurface } from "@/components/hero/glass";
import { PrivacyBadge } from "./privacy-badge";
import type { StoryRecord } from "@/domain/story/story.service";

type ListedStory = StoryRecord & { canDelete: boolean };

/**
 * The Person Profile's «Истории» tab, laid out like the redesign mock: the
 * newest story as a large card (title, the start of its text, reading
 * time), the rest as a quiet list of titles with their reading time. Each
 * links to the story's own page — the full text lives there now, not
 * inline here.
 *
 * Deletion is optimistic: DeleteStoryButton calls onDeleted inside its own
 * startTransition, so the story disappears immediately on confirm instead
 * of waiting for deleteStoryAction's revalidatePath round-trip. On pointer
 * devices the delete control only appears on hover/focus.
 */
export function PersonStoriesList({
  familyId,
  familySlug,
  personId,
  stories,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  stories: ListedStory[];
}) {
  const [optimisticStories, removeOptimisticStory] = useOptimistic(
    stories,
    (state, deletedStoryId: string) =>
      state.filter((story) => story.id !== deletedStoryId),
  );
  const [featured, ...rest] = optimisticStories;
  if (!featured) return null;

  const href = (story: ListedStory) =>
    `/families/${familySlug}/stories/${story.slug}`;
  const minutes = (story: ListedStory) =>
    `${readingMinutes(layoutStoryBody(story.body).wordCount)} мин`;
  const deleteControl = (story: ListedStory) =>
    story.canDelete && (
      <span className="relative z-10 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/story:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
        <DeleteStoryButton
          familyId={familyId}
          personId={personId}
          storyId={story.id}
          onDeleted={() => removeOptimisticStory(story.id)}
        />
      </span>
    );

  return (
    <div className="flex flex-col gap-6">
      <article
        className={`${glassSurface} group/story relative flex flex-col gap-3 rounded-3xl p-6 transition-colors duration-200 ease-(--ease-reveal) hover:bg-glass-strong sm:p-8`}
      >
        <Link
          href={href(featured)}
          className="absolute inset-0 rounded-3xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={featured.title}
        />
        <span className="flex items-center gap-1.5 text-sm text-foreground/55">
          <ClockIcon className="size-4" aria-hidden="true" />
          {minutes(featured)} чтения
        </span>
        <h3 className="flex items-center gap-2 text-2xl font-normal tracking-[-0.015em] text-balance">
          {featured.title}
          <PrivacyBadge privacyLevel={featured.privacyLevel} compact />
        </h3>
        <p className="line-clamp-3 max-w-[60ch] text-foreground/70">
          {featured.body}
        </p>
        <div className="absolute top-3 right-3 z-10 sm:top-5 sm:right-5">
          {deleteControl(featured)}
        </div>
      </article>

      {rest.length > 0 && (
        <ul className="flex flex-col border-t border-glass-edge">
          {rest.map((story) => (
            <li
              key={story.id}
              className="group/story relative flex items-center gap-3 border-b border-glass-edge py-4 pl-1"
            >
              <Link
                href={href(story)}
                className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={story.title}
              />
              <span className="flex-1 truncate text-lg">{story.title}</span>
              {deleteControl(story)}
              <span className="text-sm text-foreground/50 tabular-nums">
                {minutes(story)}
              </span>
              <ChevronRightIcon
                className="size-4 text-foreground/35 transition-transform duration-200 ease-(--ease-reveal) group-hover/story:translate-x-0.5"
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
