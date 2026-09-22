import { canView, type ActingMember } from "@/domain/family/permissions";
import { listPlaces, type PlaceRecord } from "./place.service";
import { listPeople } from "@/domain/person/person.service";
import type { PersonRecord } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import { listEventsWithPlace } from "@/domain/event/event.service";
import type { EventRecord } from "@/domain/event/event.repository";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";

export interface MapMarkerPerson {
  id: string;
  slug: string;
  name: string;
  /** Which of the Person's two Place links put them on this marker. */
  relation: "birth" | "death";
}

export interface MapMarkerEvent {
  id: string;
  title: string;
  typeLabel: string;
}

export interface PlaceMarker {
  placeId: string;
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  people: MapMarkerPerson[];
  events: MapMarkerEvent[];
}

/**
 * Assembles privacy-safe map markers for /map: one per Place that has
 * coordinates, each carrying only the Person/Event links `member` is
 * actually entitled to see (per canView — same PRIVATE-object rule as
 * every other filterVisibleX in the domain layer, see permissions.ts).
 *
 * Place itself carries no privacyLevel/createdBy of its own (see
 * db/schema/place.ts) — a Place pin's existence is visible to any family
 * member regardless of what's linked to it; only the *content* attached to
 * the pin (whose birth/death this was, which events happened here) is
 * privacy-filtered. A Place with zero visible links still renders as a
 * bare pin (name only) rather than being hidden entirely — hiding it would
 * leak nothing since Place has no sensitive fields of its own, and a family
 * member who added "grandma's village" with no records linked yet should
 * still see it on the map.
 */
export async function getFamilyMapMarkers(
  familyId: string,
  member: ActingMember,
): Promise<PlaceMarker[]> {
  const [places, people, events] = await Promise.all([
    listPlaces(familyId),
    listPeople(familyId),
    listEventsWithPlace(familyId),
  ]);

  const placesById = new Map<string, PlaceRecord>(
    places.map((place) => [place.id, place]),
  );

  const peopleByPlaceId = new Map<string, MapMarkerPerson[]>();
  function addPersonLink(
    placeId: string | null,
    person: PersonRecord,
    relation: "birth" | "death",
  ) {
    if (!placeId) return;
    if (!placesById.has(placeId)) return;
    if (
      !canView(member, {
        privacyLevel: person.privacyLevel,
        createdBy: person.createdBy,
      })
    ) {
      return;
    }
    const existing = peopleByPlaceId.get(placeId) ?? [];
    existing.push({
      id: person.id,
      slug: person.slug,
      name: personDisplayName(person),
      relation,
    });
    peopleByPlaceId.set(placeId, existing);
  }
  for (const person of people) {
    addPersonLink(person.birthPlaceId, person, "birth");
    addPersonLink(person.deathPlaceId, person, "death");
  }

  const eventsByPlaceId = new Map<string, MapMarkerEvent[]>();
  function addEventLink(event: EventRecord) {
    if (!event.placeId) return;
    if (!placesById.has(event.placeId)) return;
    if (
      !canView(member, {
        privacyLevel: event.privacyLevel,
        createdBy: event.createdBy ?? "",
      })
    ) {
      return;
    }
    const existing = eventsByPlaceId.get(event.placeId) ?? [];
    existing.push({
      id: event.id,
      title: event.title,
      typeLabel: EVENT_TYPE_LABELS[event.type] ?? event.type,
    });
    eventsByPlaceId.set(event.placeId, existing);
  }
  for (const event of events) {
    addEventLink(event);
  }

  const markers: PlaceMarker[] = [];
  for (const place of places) {
    if (place.latitude == null || place.longitude == null) continue;
    markers.push({
      placeId: place.id,
      name: place.name,
      region: place.region,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      people: peopleByPlaceId.get(place.id) ?? [],
      events: eventsByPlaceId.get(place.id) ?? [],
    });
  }
  return markers;
}
