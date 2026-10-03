import type { ActingMember } from "@/domain/family/permissions";
import { listPlaces } from "./place.service";
import {
  filterVisiblePersons,
  listPeople,
} from "@/domain/person/person.service";
import {
  personDisplayName,
  personInitials,
} from "@/domain/person/display-name";
import {
  filterVisibleEvents,
  listEventsWithPlace,
  listPlacedEventParticipants,
} from "@/domain/event/event.service";
import type { EventType } from "@/domain/event/event.repository";
import {
  getAllParentChildEdges,
  getAllPartnershipEdges,
} from "@/domain/relationship/relationship.repository";
import type { Locale } from "@/domain/shared/locale";
import { findBranches } from "./family-branches";
import { buildGeoModel } from "./geo-model";
import { pathOf, timelineRange, type GeoModel } from "./map-snapshot";

export interface MapPlace {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  /** Null for a place without a point — listed, never drawn. */
  latitude: number | null;
  longitude: number | null;
}

export interface MapPerson {
  id: string;
  slug: string;
  name: string;
  firstName: string;
  initials: string;
  photoMediaId: string | null;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
}

export interface MapEvent {
  id: string;
  type: EventType;
  title: string;
}

export interface MapBranch {
  rootId: string;
  surname: string | null;
  memberIds: string[];
  generations: number;
  /** Where the branch starts — the founders' birthplace, else their first stop. */
  originPlaceId: string;
  since: number | null;
  /** Places in the order the branch first reached them. */
  placeIds: string[];
}

/** What a map editor still has to fill in — never shown to viewers. */
export interface MapGaps {
  placesWithoutPoint: number;
  peopleWithoutBirthplace: number;
  undatedStops: number;
}

export interface FamilyMapData {
  model: GeoModel;
  places: MapPlace[];
  people: Record<string, MapPerson>;
  events: Record<string, MapEvent>;
  branches: MapBranch[];
  gaps: MapGaps | null;
}

/**
 * Everything the family map needs, in one serializable payload, holding
 * only what `member` may see: private People and Events (canView) are
 * dropped before anything is derived from them, so a hidden person leaves
 * no stop, no route, no count and no branch behind. A Place itself carries
 * nothing private — a bare pin stays visible: hiding it would leak
 * nothing, and «grandma's village» with no records yet still belongs there.
 */
export async function getFamilyMapData(
  familyId: string,
  member: ActingMember,
  locale: Locale,
  canEdit: boolean,
): Promise<FamilyMapData> {
  const [allPlaces, allPeople, allEvents, participants, parentChild, partners] =
    await Promise.all([
      listPlaces(familyId),
      listPeople(familyId),
      listEventsWithPlace(familyId),
      listPlacedEventParticipants(familyId),
      getAllParentChildEdges(familyId),
      getAllPartnershipEdges(familyId),
    ]);

  const people = filterVisiblePersons(allPeople, member);
  const visibleIds = new Set(people.map((p) => p.id));
  const events = filterVisibleEvents(allEvents, member);
  const participantsByEvent = new Map<string, string[]>();
  for (const p of participants) {
    if (!visibleIds.has(p.personId)) continue;
    participantsByEvent.set(p.eventId, [
      ...(participantsByEvent.get(p.eventId) ?? []),
      p.personId,
    ]);
  }
  const drawable = allPlaces.filter(
    (p) => p.latitude != null && p.longitude != null,
  );
  const parentChildEdges = parentChild.filter(
    (e) => visibleIds.has(e.parentId) && visibleIds.has(e.childId),
  );
  const partnerEdges = partners.filter(
    (e) => visibleIds.has(e.person1Id) && visibleIds.has(e.person2Id),
  );

  const chronoPeople = people.map((p) => ({
    id: p.id,
    isLiving: p.isLiving,
    birthYear: p.birthDate?.year ?? null,
    deathYear: p.deathDate?.year ?? null,
    birthPlaceId: p.birthPlaceId,
    deathPlaceId: p.deathPlaceId,
    residencePlaceId: p.residencePlaceId,
    lastName: p.lastName,
    maidenName: p.maidenName,
  }));
  const model = buildGeoModel({
    persons: chronoPeople,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      year: e.date?.year ?? null,
      placeId: e.placeId as string,
      participantIds: participantsByEvent.get(e.id) ?? [],
    })),
    places: drawable,
    parentChild: parentChildEdges,
    partners: partnerEdges,
    currentYear: new Date().getUTCFullYear(),
  });

  const branches: MapBranch[] = [];
  const found = findBranches(
    chronoPeople,
    parentChildEdges,
    partnerEdges,
    new Map(Object.entries(model.generations)),
  );
  for (const branch of found) {
    const path = pathOf(model, new Set(branch.memberIds));
    const founders = branch.rootIds.map((id) =>
      chronoPeople.find((p) => p.id === id),
    );
    const birthplace = founders.find(
      (p) =>
        p?.birthPlaceId && model.countryByPlaceId[p.birthPlaceId] !== undefined,
    )?.birthPlaceId;
    const originPlaceId = birthplace ?? path.placeIds[0];
    // A branch nobody can place on the map has no «откуда».
    if (!originPlaceId) continue;
    const years = founders
      .map((p) => p?.birthYear)
      .filter((y): y is number => y != null);
    const firstStay = model.stays
      .filter((s) => branch.memberIds.includes(s.personId))
      .reduce<number | null>(
        (min, s) => (min === null || s.from < min ? s.from : min),
        null,
      );
    branches.push({
      rootId: branch.rootId,
      surname: branch.surname,
      memberIds: branch.memberIds,
      generations: branch.generations,
      originPlaceId,
      since: years.length > 0 ? Math.min(...years) : firstStay,
      placeIds: [
        originPlaceId,
        ...path.placeIds.filter((id) => id !== originPlaceId),
      ],
    });
  }

  return {
    model,
    places: allPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      region: p.region,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
    people: Object.fromEntries(
      people.map((p) => [
        p.id,
        {
          id: p.id,
          slug: p.slug,
          name: personDisplayName(p, locale),
          firstName: p.firstName?.trim() || personDisplayName(p, locale),
          initials: personInitials(p),
          photoMediaId: p.photoMediaId,
          isLiving: p.isLiving,
          birthYear: p.birthDate?.year ?? null,
          deathYear: p.deathDate?.year ?? null,
        },
      ]),
    ),
    events: Object.fromEntries(
      events.map((e) => [e.id, { id: e.id, type: e.type, title: e.title }]),
    ),
    branches,
    gaps: canEdit
      ? {
          placesWithoutPoint: allPlaces.length - drawable.length,
          peopleWithoutBirthplace: people.filter(
            (p) => !p.isPlaceholder && !p.birthPlaceId,
          ).length,
          undatedStops: timelineRange(model)?.undated ?? 0,
        }
      : null,
  };
}
