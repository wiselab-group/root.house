import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProfileSection } from "@/components/person/profile-section";
import { ActivityLogSection } from "./activity-log-section";
import type { ActivityLogEntry } from "@/domain/activity-log/activity-log.service";

/** Family Home's owner-only «Активность семьи» — the last few entries and
 *  an «Ещё» link to the full log in Settings, on the heading row like
 *  «Весь архив» in «Последние фото» (user request). Split out of page.tsx. */
export function FamilyHomeActivity({
  familySlug,
  entries,
  hasMore,
}: {
  familySlug: string;
  entries: ActivityLogEntry[];
  hasMore: boolean;
}) {
  return (
    <ProfileSection
      title="Активность семьи"
      action={
        hasMore && (
          <Link
            href={`/families/${familySlug}/settings#activity`}
            className="group flex shrink-0 items-center gap-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            Ещё
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )
      }
    >
      <ActivityLogSection entries={entries} />
    </ProfileSection>
  );
}
