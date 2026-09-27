import { useTranslations } from "next-intl";
import type messages from "../../../messages/ru.json";

type EventRoleKey = keyof typeof messages.eventRoles;

/** Client/server-component twin of getEventWording().roleLabel — roles are
 *  free text in the DB, so an unknown one is shown as stored. */
export function useEventRoleLabel(): (role: string) => string {
  const t = useTranslations("eventRoles");
  return (role) =>
    t.has(role as EventRoleKey) ? t(role as EventRoleKey) : role;
}
