import { and, eq, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  mediaPerson,
  media,
  storyPerson,
  stories,
  eventParticipants,
  events,
} from "@/db/schema";
import type { ActingMember } from "@/domain/family/permissions";
import type { PersonArchiveSummary } from "./tree-layout.builder";

/**
 * The same PRIVATE-visibility rule as domain/family/permissions.ts's
 * canView (owner sees everything; everyone else sees non-private content
 * plus their own), expressed as a SQL predicate instead of applied to
 * already-fetched rows in TypeScript — the whole point of counting in SQL
 * is to never fetch the underlying rows at all. `!= 'private'` reads
 * correctly under 3-valued SQL logic here: privacy_level is NOT NULL on
 * every one of these tables (schema default 'family').
 */
function visibleToViewerPredicate(
  viewer: ActingMember,
  privacyLevelColumn: PgColumn,
  createdByColumn: PgColumn,
) {
  if (viewer.role === "owner") return sql`true`;
  return or(
    sql`${privacyLevelColumn} != 'private'`,
    eq(createdByColumn, viewer.userId),
  );
}

/** How many gallery photos (kind: 'photo', avatars excluded) each Person in
 *  `familyId` is tagged in, restricted to what `viewer` may see. Exported
 *  for archive-summary.test.ts to assert on the generated SQL/params
 *  without a live database (see album.repository.test.ts's own
 *  buildAlbumsWithCoverQuery for the same pattern). */
export function buildPersonPhotoCountQuery(
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({
      personId: mediaPerson.personId,
      count: sql<number>`count(*)::int`,
    })
    .from(mediaPerson)
    .innerJoin(media, eq(media.id, mediaPerson.mediaId))
    .where(
      and(
        eq(media.familyId, familyId),
        eq(media.kind, "photo"),
        visibleToViewerPredicate(viewer, media.privacyLevel, media.uploadedBy),
      ),
    )
    .groupBy(mediaPerson.personId);
}

/** How many Stories each Person in `familyId` is tagged in, restricted to
 *  what `viewer` may see. */
export function buildPersonStoryCountQuery(
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({
      personId: storyPerson.personId,
      count: sql<number>`count(*)::int`,
    })
    .from(storyPerson)
    .innerJoin(stories, eq(stories.id, storyPerson.storyId))
    .where(
      and(
        eq(stories.familyId, familyId),
        visibleToViewerPredicate(
          viewer,
          stories.privacyLevel,
          stories.authorId,
        ),
      ),
    )
    .groupBy(storyPerson.personId);
}

/** How many distinct Events each Person in `familyId` participates in,
 *  restricted to what `viewer` may see. event_participants carries one row
 *  per (event, person, role) — a person holding two roles on the same
 *  event (rare, but the schema allows it) must still count as one event,
 *  hence COUNT(DISTINCT event_id). */
export function buildPersonEventCountQuery(
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({
      personId: eventParticipants.personId,
      count: sql<number>`count(distinct ${eventParticipants.eventId})::int`,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .where(
      and(
        eq(events.familyId, familyId),
        visibleToViewerPredicate(viewer, events.privacyLevel, events.createdBy),
      ),
    )
    .groupBy(eventParticipants.personId);
}

/**
 * One batched, family-wide aggregate per content type (never one query per
 * Person — see tree.service.ts's own fetchTreeRows, which this follows the
 * same "whole family in one shot" shape as) computing how many photos/
 * stories/events each Person is connected to, already viewer-filtered in
 * SQL (see visibleToViewerPredicate's own doc comment).
 *
 * photoCount only counts `kind: 'photo'` Media, excluding avatars —
 * video/audio/document tags on a person aren't folded into this number,
 * matching CLAUDE.md's "photos/stories/events" Phase 1 scope
 * (video/audio/document counts are an explicit "if practical" extension,
 * not implemented here).
 */
export async function getPersonArchiveSummaries(
  familyId: string,
  viewer: ActingMember,
): Promise<Map<string, PersonArchiveSummary>> {
  const [photoRows, storyRows, eventRows] = await Promise.all([
    buildPersonPhotoCountQuery(familyId, viewer),
    buildPersonStoryCountQuery(familyId, viewer),
    buildPersonEventCountQuery(familyId, viewer),
  ]);

  const summaries = new Map<string, PersonArchiveSummary>();
  const get = (personId: string): PersonArchiveSummary => {
    let summary = summaries.get(personId);
    if (!summary) {
      summary = { photoCount: 0, storyCount: 0, eventCount: 0 };
      summaries.set(personId, summary);
    }
    return summary;
  };
  for (const row of photoRows) get(row.personId).photoCount = row.count;
  for (const row of storyRows) get(row.personId).storyCount = row.count;
  for (const row of eventRows) get(row.personId).eventCount = row.count;
  return summaries;
}

/** Single-person counterpart to buildPersonPhotoCountQuery — same shape,
 *  scoped to one personId, no groupBy. Exported for archive-summary.test.ts,
 *  same reasoning as the batch builders above. */
export function buildPersonPhotoCountForPersonQuery(
  personId: string,
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaPerson)
    .innerJoin(media, eq(media.id, mediaPerson.mediaId))
    .where(
      and(
        eq(mediaPerson.personId, personId),
        eq(media.familyId, familyId),
        eq(media.kind, "photo"),
        visibleToViewerPredicate(viewer, media.privacyLevel, media.uploadedBy),
      ),
    );
}

/** Single-person counterpart to buildPersonStoryCountQuery. */
export function buildPersonStoryCountForPersonQuery(
  personId: string,
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({ count: sql<number>`count(*)::int` })
    .from(storyPerson)
    .innerJoin(stories, eq(stories.id, storyPerson.storyId))
    .where(
      and(
        eq(storyPerson.personId, personId),
        eq(stories.familyId, familyId),
        visibleToViewerPredicate(
          viewer,
          stories.privacyLevel,
          stories.authorId,
        ),
      ),
    );
}

/** Single-person counterpart to buildPersonEventCountQuery. */
export function buildPersonEventCountForPersonQuery(
  personId: string,
  familyId: string,
  viewer: ActingMember,
) {
  return db
    .select({
      count: sql<number>`count(distinct ${eventParticipants.eventId})::int`,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .where(
      and(
        eq(eventParticipants.personId, personId),
        eq(events.familyId, familyId),
        visibleToViewerPredicate(viewer, events.privacyLevel, events.createdBy),
      ),
    );
}

/**
 * The single-Person counterpart to getPersonArchiveSummaries — same three
 * queries, same privacy predicate, but scoped to one personId (an extra
 * `eq(...personId, personId)` filter, no groupBy needed) instead of
 * batching the whole family. For the Person Profile page (one person per
 * page load — batching the whole family the way the tree does would fetch
 * every OTHER person's counts for nothing). Never call this in a loop over
 * multiple people on the same page; use getPersonArchiveSummaries for that
 * (see its own doc comment on the N+1 risk).
 */
export async function getPersonArchiveSummary(
  personId: string,
  familyId: string,
  viewer: ActingMember,
): Promise<PersonArchiveSummary> {
  const [[photoRow], [storyRow], [eventRow]] = await Promise.all([
    buildPersonPhotoCountForPersonQuery(personId, familyId, viewer),
    buildPersonStoryCountForPersonQuery(personId, familyId, viewer),
    buildPersonEventCountForPersonQuery(personId, familyId, viewer),
  ]);

  return {
    photoCount: photoRow?.count ?? 0,
    storyCount: storyRow?.count ?? 0,
    eventCount: eventRow?.count ?? 0,
  };
}

export const EMPTY_ARCHIVE_SUMMARY: PersonArchiveSummary = {
  photoCount: 0,
  storyCount: 0,
  eventCount: 0,
};
