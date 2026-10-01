import { cookies } from "next/headers";
import { dayPeriod, isTimeZone, TIME_ZONE_COOKIE } from "@/lib/day-period";
import type { PersonRecord } from "@/domain/person/person.service";
import type { GalleryPhoto } from "@/domain/media/media.service";
import type { StoryRecord } from "@/domain/story/story.service";
import { FamilyHomeHeader } from "./family-home-header";
import { FamilyHomeGreeting } from "./family-home-greeting";
import { TimeZoneCookie } from "./time-zone-cookie";
import {
  addedThisWeek,
  earliestBirthYear,
  familyHomeMeta,
  firstNameOf,
} from "./family-home-meta";

/**
 * Family Home's top: greeting, title and linked counts — assembled from
 * the page's already privacy-filtered lists (split out of page.tsx for the
 * 150-line ceiling). Reads the time-zone cookie for the greeting and
 * renders TimeZoneCookie so the next visit has it.
 */
export async function FamilyHomeTop({
  familySlug,
  name,
  description,
  userName,
  people,
  placeCount,
  photos,
  stories,
}: {
  familySlug: string;
  name: string;
  description: string | null;
  userName: string | null | undefined;
  people: PersonRecord[];
  placeCount: number;
  photos: GalleryPhoto[];
  stories: StoryRecord[];
}) {
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  const meta = await familyHomeMeta({
    familySlug,
    personCount: people.length,
    placeCount,
    photoCount: photos.length,
    storyCount: stories.length,
    earliestYear: earliestBirthYear(people),
  });

  return (
    <>
      <TimeZoneCookie current={timeZone ?? null} />
      <FamilyHomeHeader
        greeting={
          <FamilyHomeGreeting
            period={
              isTimeZone(timeZone) ? dayPeriod(new Date(), timeZone) : null
            }
            firstName={firstNameOf(userName)}
            weekPhotos={addedThisWeek(photos.map((p) => p.media.createdAt))}
            weekStories={addedThisWeek(
              stories.map((s) => s.publishedAt ?? s.createdAt),
            )}
            familySlug={familySlug}
          />
        }
        name={name}
        description={description}
        meta={meta}
      />
    </>
  );
}
