import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import {
  dayPeriod,
  isTimeZone,
  localDate,
  TIME_ZONE_COOKIE,
} from "@/lib/day-period";
import { getAllPartnershipEdges } from "@/domain/relationship/relationship.repository";
import { listMyDrafts } from "@/domain/story/story.service";
import type { PersonRecord } from "@/domain/person/person.service";
import type { GalleryPhoto } from "@/domain/media/media.service";
import type { StoryRecord } from "@/domain/story/story.service";
import { FamilyHomeHeader } from "./family-home-header";
import { FamilyHomeGreeting } from "./family-home-greeting";
import { TimeZoneCookie } from "./time-zone-cookie";
import { greetingNote } from "./greeting-note";
import {
  addedThisWeek,
  earliestBirthYear,
  familyHomeMeta,
  firstNameOf,
} from "./family-home-meta";

/**
 * Family Home's top: greeting, title and linked counts — assembled from
 * the page's already privacy-filtered lists (split out of page.tsx for the
 * 150-line ceiling), plus the greeting's own data: partnerships (wedding
 * anniversaries) and this user's drafts. Reads the time-zone cookie for
 * the greeting and renders TimeZoneCookie so the next visit has it. The
 * page has already checked family access.
 */
export async function FamilyHomeTop({
  familyId,
  userId,
  familySlug,
  name,
  description,
  userName,
  people,
  placeCount,
  photos,
  stories,
}: {
  familyId: string;
  userId: string;
  familySlug: string;
  name: string;
  description: string | null;
  userName: string | null | undefined;
  people: PersonRecord[];
  placeCount: number;
  photos: GalleryPhoto[];
  stories: StoryRecord[];
}) {
  const [cookieStore, locale, partnerships, drafts] = await Promise.all([
    cookies(),
    getLocale(),
    getAllPartnershipEdges(familyId),
    listMyDrafts(familyId, userId),
  ]);
  const timeZone = cookieStore.get(TIME_ZONE_COOKIE)?.value;
  const now = new Date();
  const note = greetingNote({
    today: localDate(now, timeZone),
    locale,
    familySlug,
    people,
    partnerships,
    drafts,
    weekPhotos: addedThisWeek(photos.map((p) => p.media.createdAt)),
    weekStories: addedThisWeek(
      stories.map((s) => s.publishedAt ?? s.createdAt),
    ),
  });
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
            period={isTimeZone(timeZone) ? dayPeriod(now, timeZone) : null}
            firstName={firstNameOf(userName)}
            note={note}
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
