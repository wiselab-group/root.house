import type { FamilyRole } from "./roles";

/** User-facing Russian labels for each FamilyRole — shared by the Members
 *  settings UI, the invite form's role picker, and the invite preview page. */
export const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: "Владелец",
  editor: "Редактор",
  contributor: "Соавтор",
  viewer: "Читатель",
};
