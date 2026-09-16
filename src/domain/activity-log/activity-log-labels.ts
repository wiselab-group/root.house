import type {
  ActivityAction,
  ActivityEntityType,
} from "./activity-log.service";

/** Past-tense Russian verb for each action, agreeing with a masculine actor
 *  name by default — see activity-log-section.tsx for how this is combined
 *  with the actor's display name and entity label into one sentence. */
export const ACTIVITY_ACTION_VERBS: Record<ActivityAction, string> = {
  create: "добавил(а)",
  update: "изменил(а)",
  delete: "удалил(а)",
};

/** Short Russian noun for each entity type — used only as a fallback prefix
 *  when entityLabel alone would read ambiguously (not currently needed by
 *  the UI, kept for future use e.g. filtering by type). */
export const ACTIVITY_ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  person: "Человек",
  relationship_parent_child: "Родственная связь",
  relationship_partnership: "Партнёрство",
  event: "Событие",
  media: "Медиа",
  story: "История",
  album: "Альбом",
};
