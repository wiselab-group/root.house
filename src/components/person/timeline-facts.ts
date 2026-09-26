import {
  isSyntheticEventId,
  type TimelineEvent,
} from "@/domain/event/event.service";
import { getParticipantsOf } from "@/domain/event/event.repository";
import { EVENT_ROLE_LABELS } from "@/domain/event/event-roles";
import { getPersonById } from "@/domain/person/person.repository";
import type { PersonRecord } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import { canView, type ActingMember } from "@/domain/family/permissions";
import {
  getParentsOf,
  type PartnershipRecord,
} from "@/domain/relationship/relationship.repository";
import { formatPartialDate } from "@/domain/shared/partial-date";

/**
 * The «what else is known» lines under a Линия жизни card, for the facts
 * that need other people's names: who else took part in an event, the
 * parents on a person's own birth, the spouse and how the marriage ended.
 * Every name goes through canView — a private relative the viewer can't
 * open never shows up here by name (the line is just left out).
 */
export async function resolveTimelineFacts({
  timeline,
  personId,
  familyId,
  partnerships,
  member,
}: {
  timeline: TimelineEvent[];
  personId: string;
  familyId: string;
  partnerships: PartnershipRecord[];
  member: ActingMember;
}): Promise<Map<string, string[]>> {
  const visiblePerson = async (id: string) => {
    const person = await getPersonById(id, familyId);
    return person && canView(member, person) ? person : null;
  };

  const entries = await Promise.all(
    timeline.map(async (event): Promise<[string, string[]]> => {
      if (!isSyntheticEventId(event.id)) {
        return [
          event.id,
          await participantFacts(event, personId, familyId, visiblePerson),
        ];
      }
      if (event.type === "birth" && !event.relatedPerson) {
        return [event.id, await parentFacts(personId, familyId, visiblePerson)];
      }
      if (event.type === "marriage") {
        const partnership = partnerships.find(
          (item) => event.id === `synthetic:marriage:${item.id}`,
        );
        return [
          event.id,
          partnership
            ? await marriageFacts(partnership, personId, visiblePerson)
            : [],
        ];
      }
      return [event.id, []];
    }),
  );
  return new Map(entries.filter(([, facts]) => facts.length > 0));
}

type VisiblePerson = (id: string) => Promise<PersonRecord | null>;

async function participantFacts(
  event: TimelineEvent,
  personId: string,
  familyId: string,
  visiblePerson: VisiblePerson,
): Promise<string[]> {
  const participants = (await getParticipantsOf(event.id, familyId)).filter(
    (participant) => participant.personId !== personId,
  );
  const names = await Promise.all(
    participants.map(async (participant) => {
      const person = await visiblePerson(participant.personId);
      if (!person) return null;
      // «участник» says nothing on a card that's already about taking part.
      const role =
        participant.role === "subject" || participant.role === "participant"
          ? null
          : (EVENT_ROLE_LABELS[participant.role] ?? participant.role);
      return role
        ? `${personDisplayName(person)} (${role})`
        : personDisplayName(person);
    }),
  );
  const visible = names.filter((name): name is string => name !== null);
  return visible.length > 0 ? [`Участники: ${visible.join(", ")}`] : [];
}

async function parentFacts(
  personId: string,
  familyId: string,
  visiblePerson: VisiblePerson,
): Promise<string[]> {
  const edges = await getParentsOf(personId, familyId);
  const parents = (
    await Promise.all(edges.map((edge) => visiblePerson(edge.parentId)))
  ).filter((parent): parent is PersonRecord => parent !== null);
  if (parents.length === 0) return [];
  if (parents.length > 1) {
    return [`Родители: ${parents.map(personDisplayName).join(", ")}`];
  }
  const [parent] = parents;
  const label =
    parent.gender === "female"
      ? "Мать"
      : parent.gender === "male"
        ? "Отец"
        : "Родитель";
  return [`${label}: ${personDisplayName(parent)}`];
}

async function marriageFacts(
  partnership: PartnershipRecord,
  personId: string,
  visiblePerson: VisiblePerson,
): Promise<string[]> {
  const facts: string[] = [];
  const spouse = await visiblePerson(
    partnership.person1Id === personId
      ? partnership.person2Id
      : partnership.person1Id,
  );
  if (spouse) {
    const label =
      spouse.gender === "female"
        ? "Супруга"
        : spouse.gender === "male"
          ? "Супруг"
          : "Супруг(а)";
    facts.push(`${label}: ${personDisplayName(spouse)}`);
  }
  const ending = MARRIAGE_ENDINGS[partnership.status];
  if (ending) {
    facts.push(
      partnership.endDate?.year != null
        ? `${ending}: ${formatPartialDate(partnership.endDate)}`
        : ending,
    );
  }
  return facts;
}

/** How a marriage ended, when it did — a still-current one says nothing. */
const MARRIAGE_ENDINGS: Partial<Record<PartnershipRecord["status"], string>> = {
  divorced: "Развод",
  separated: "Расставание",
  widowed: "Брак прервала смерть",
};
