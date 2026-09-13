import type { FamilyRole } from "./roles";

/** User-facing Russian labels for each FamilyRole — shared by the Members
 *  settings UI, the invite form's role picker, and the invite preview page. */
export const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: "Владелец",
  editor: "Редактор",
  contributor: "Соавтор",
  viewer: "Читатель",
};

/** One-line, plain-language explanation of what each role can actually do —
 *  shown as a hint under the role picker (invite form and per-member role
 *  select) so a non-technical family member understands the choice without
 *  having to guess from the label alone. Mirrors the real rules in
 *  domain/family/permissions.ts, kept in everyday language rather than
 *  spec terms ("CONTRIBUTOR", "ContributableEntity"). */
export const ROLE_DESCRIPTIONS: Record<FamilyRole, string> = {
  owner:
    "Полный доступ: управляет участниками и настройками, может редактировать и удалять всё.",
  editor:
    "Может редактировать дерево, профили и события — как владелец, но без управления участниками.",
  contributor:
    "Может добавлять события, фото и истории, но редактировать чужие записи не может.",
  viewer:
    "Может только просматривать дерево и профили, без права что-либо менять.",
};
