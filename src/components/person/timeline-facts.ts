import {
  isSyntheticEventId,
  type TimelineEvent,
} from "@/domain/event/event.service";
import { getParticipantsOf } from "@/domain/event/event.repository";
import { getPersonById } from "@/domain/person/person.repository";
import type { PersonRecord } from "@/domain/person/person.repository";
import {
  personDisplayName,
  personInitials,
} from "@/domain/person/display-name";
import { mediaUrl } from "@/lib/media-url";
import { canView, type ActingMember } from "@/domain/family/permissions";
import {
  getParentsOf,
  type PartnershipRecord,
} from "@/domain/relationship/relationship.repository";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { getEventWording, type EventWording } from "./event-wording";

/** Someone named in a fact — drawn as a chip with their face that opens
 *  their profile. */
export interface FactPerson {
  id: string;
  name: string;
  /** Their part in the event («свидетель»), when it says something. */
  role: string | null;
  href: string;
  /** Portrait thumbnail, or null for the initials. */
  photoUrl: string | null;
  initials: string;
}

/** One «what else is known» line: plain text, or a label with people. */
export type TimelineFact =
  | { kind: "text"; text: string }
  | { kind: "people"; label: string; people: FactPerson[] };

/**
 * The «what else is known» lines under a Линия жизни card, for the facts
 * about other people: who else took part in an event, the parents on a
 * person's own birth, the spouse and how the marriage ended. People come
 * as people (name, face, profile link), not baked into a sentence, so the
 * card can show them as chips with avatars (user request 2026-10-02).
 * Every person goes through canView — a private relative the viewer can't
 * open never shows up here (the chip, or the whole line, is left out).
 */
export async function resolveTimelineFacts({
  timeline,
  personId,
  familyId,
  familySlug,
  partnerships,
  member,
}: {
  timeline: TimelineEvent[];
  personId: string;
  familyId: string;
  familySlug: string;
  partnerships: PartnershipRecord[];
  member: ActingMember;
}): Promise<Map<string, TimelineFact[]>> {
  const wording = await getEventWording();
  const visiblePerson = async (id: string) => {
    const person = await getPersonById(id, familyId);
    return person && canView(member, person) ? person : null;
  };
  const chip = (person: PersonRecord, role: string | null = null) =>
    factPerson(person, role, familyId, familySlug, wording);

  const entries = await Promise.all(
    timeline.map(async (event): Promise<[string, TimelineFact[]]> => {
      if (!isSyntheticEventId(event.id)) {
        return [
          event.id,
          await participantFacts(
            event,
            personId,
            familyId,
            visiblePerson,
            chip,
            wording,
          ),
        ];
      }
      if (event.type === "birth" && !event.relatedPerson) {
        return [
          event.id,
          await parentFacts(personId, familyId, visiblePerson, chip, wording),
        ];
      }
      if (event.type === "marriage") {
        const partnership = partnerships.find(
          (item) => event.id === `synthetic:marriage:${item.id}`,
        );
        return [
          event.id,
          partnership
            ? await marriageFacts(
                partnership,
                personId,
                visiblePerson,
                chip,
                wording,
              )
            : [],
        ];
      }
      return [event.id, []];
    }),
  );
  return new Map(entries.filter(([, facts]) => facts.length > 0));
}

type VisiblePerson = (id: string) => Promise<PersonRecord | null>;
type Chip = (person: PersonRecord, role?: string | null) => FactPerson;

function factPerson(
  person: PersonRecord,
  role: string | null,
  familyId: string,
  familySlug: string,
  { locale }: EventWording,
): FactPerson {
  return {
    id: person.id,
    name: personDisplayName(person, locale),
    role,
    href: `/families/${familySlug}/people/${person.slug}`,
    photoUrl: person.photoMediaId
      ? mediaUrl(person.photoMediaId, familyId, "thumb")
      : null,
    initials: personInitials(person),
  };
}

async function participantFacts(
  event: TimelineEvent,
  personId: string,
  familyId: string,
  visiblePerson: VisiblePerson,
  chip: Chip,
  { t, roleLabel }: EventWording,
): Promise<TimelineFact[]> {
  const participants = (await getParticipantsOf(event.id, familyId)).filter(
    (participant) => participant.personId !== personId,
  );
  const people = await Promise.all(
    participants.map(async (participant) => {
      const person = await visiblePerson(participant.personId);
      if (!person) return null;
      // «участник» says nothing on a card that's already about taking part.
      const role =
        participant.role === "subject" || participant.role === "participant"
          ? null
          : roleLabel(participant.role);
      return chip(person, role);
    }),
  );
  const visible = people.filter((person) => person !== null);
  return visible.length > 0
    ? [{ kind: "people", label: t("participantsLabel"), people: visible }]
    : [];
}

async function parentFacts(
  personId: string,
  familyId: string,
  visiblePerson: VisiblePerson,
  chip: Chip,
  { t }: EventWording,
): Promise<TimelineFact[]> {
  const edges = await getParentsOf(personId, familyId);
  const parents = (
    await Promise.all(edges.map((edge) => visiblePerson(edge.parentId)))
  ).filter((parent): parent is PersonRecord => parent !== null);
  if (parents.length === 0) return [];
  const label =
    parents.length > 1
      ? t("parentsLabel")
      : t("parentLabel", { gender: parents[0].gender });
  return [
    { kind: "people", label, people: parents.map((parent) => chip(parent)) },
  ];
}

async function marriageFacts(
  partnership: PartnershipRecord,
  personId: string,
  visiblePerson: VisiblePerson,
  chip: Chip,
  { locale, t }: EventWording,
): Promise<TimelineFact[]> {
  const facts: TimelineFact[] = [];
  const spouse = await visiblePerson(
    partnership.person1Id === personId
      ? partnership.person2Id
      : partnership.person1Id,
  );
  if (spouse) {
    facts.push({
      kind: "people",
      label: t("spouseLabel", { gender: spouse.gender }),
      people: [chip(spouse)],
    });
  }
  const endingKey =
    partnership.status in MARRIAGE_ENDINGS
      ? MARRIAGE_ENDINGS[partnership.status as keyof typeof MARRIAGE_ENDINGS]
      : null;
  if (endingKey) {
    const ending = t(endingKey);
    facts.push({
      kind: "text",
      text:
        partnership.endDate?.year != null
          ? t("endedOn", {
              ending,
              date: formatPartialDate(partnership.endDate, locale),
            })
          : ending,
    });
  }
  return facts;
}

/** How a marriage ended, when it did — a still-current one says nothing. */
const MARRIAGE_ENDINGS = {
  divorced: "divorced",
  separated: "separated",
  widowed: "widowed",
} as const satisfies Partial<Record<PartnershipRecord["status"], string>>;
