import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PrivacyBadge } from "@/components/person/privacy-badge";
import { personDisplayName } from "@/domain/person/display-name";
import type { StoryRecord } from "@/domain/story/story.service";
import type { PersonRecord } from "@/domain/person/person.repository";

const PREVIEW_LENGTH = 180;

function previewOf(body: string): string {
  if (body.length <= PREVIEW_LENGTH) return body;
  const lastSpace = body.lastIndexOf(" ", PREVIEW_LENGTH);
  const cutoff = lastSpace > 0 ? lastSpace : PREVIEW_LENGTH;
  return `${body.slice(0, cutoff).trimEnd()}…`;
}

/**
 * Family-wide stories feed (/families/[slug]/stories) — same editorial
 * "divide-y list, no cards" treatment as PeopleList, adapted for a story's
 * shape: title + short body preview + linked people, instead of an
 * avatar row. Each row reads as one memory, not a database record.
 */
export function StoriesList({
  familySlug,
  stories,
  peopleByStoryId,
}: {
  familySlug: string;
  stories: StoryRecord[];
  peopleByStoryId: Map<string, PersonRecord[]>;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {stories.map((story, index) => {
        const people = peopleByStoryId.get(story.id) ?? [];
        return (
          <li
            key={story.id}
            className="animate-content-enter"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <Link
              href={`/families/${familySlug}/stories/${story.slug}`}
              className="group/row flex items-start justify-between gap-4 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="flex items-center gap-1.5 font-heading text-lg font-medium transition-colors group-hover/row:text-primary">
                  {story.title}
                  <PrivacyBadge privacyLevel={story.privacyLevel} compact />
                </span>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {previewOf(story.body)}
                </p>
                {people.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {people.map((p) => personDisplayName(p)).join(", ")}
                  </p>
                )}
              </div>
              <ArrowRight
                className="mt-1 size-5 shrink-0 text-muted-foreground/60 transition-all duration-200 ease-(--ease-tree-focus) group-hover/row:translate-x-1 group-hover/row:text-primary"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
