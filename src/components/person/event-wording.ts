import { getLocale, getTranslations } from "next-intl/server";
import type { EventType } from "@/domain/event/event.repository";
import type { TimelineEvent } from "@/domain/event/event.service";
import type messages from "../../../messages/ru.json";

type EventRoleKey = keyof typeof messages.eventRoles;

/**
 * Everything the timeline needs to put an event into words, in the
 * request's language. The domain hands over structure only — synthetic
 * birth/death/marriage entries have an empty title, a child's birth
 * carries `relatedPerson`, the age is a number — and this is where it
 * becomes «Родилась дочь Эва» / "Daughter born: Eva".
 */
export async function getEventWording() {
  const locale = await getLocale();
  const t = await getTranslations("timeline");
  const tTypes = await getTranslations("eventTypes");
  const tRoles = await getTranslations("eventRoles");
  const tCommon = await getTranslations("common");

  const typeLabel = (type: EventType) => tTypes(type);

  /** Roles are free text in the DB — an unknown one is shown as stored. */
  const roleLabel = (role: string) =>
    tRoles.has(role as EventRoleKey) ? tRoles(role as EventRoleKey) : role;

  const title = (event: TimelineEvent) =>
    event.relatedPerson
      ? t("childBorn", {
          gender: event.relatedPerson.gender,
          name: event.relatedPerson.firstName || tCommon("unnamed"),
        })
      : event.title.trim() || typeLabel(event.type);

  return { locale, t, typeLabel, roleLabel, title };
}

export type EventWording = Awaited<ReturnType<typeof getEventWording>>;
