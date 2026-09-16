import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLog, users } from "@/db/schema";

export type ActivityAction = "create" | "update" | "delete";
export type ActivityEntityType =
  | "person"
  | "relationship_parent_child"
  | "relationship_partnership"
  | "event"
  | "media"
  | "story"
  | "album";

export interface RecordActivityData {
  familyId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
}

export async function recordActivity(data: RecordActivityData): Promise<void> {
  await db.insert(activityLog).values(data);
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
  createdAt: Date;
}

/**
 * Reverse-chronological page of a family's activity log, joined with the
 * actor's User row for display — keyset-paginated on createdAt (the log can
 * grow indefinitely, an OFFSET page would get slower over time). Pass the
 * last entry's `createdAt` from the previous page as `before` to continue.
 */
export async function listActivityForFamily(
  familyId: string,
  options?: { limit?: number; before?: Date },
): Promise<ActivityLogEntry[]> {
  const limit = options?.limit ?? 50;

  const rows = await db
    .select({
      id: activityLog.id,
      actorId: activityLog.actorId,
      actorName: users.name,
      actorEmail: users.email,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      entityLabel: activityLog.entityLabel,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.actorId, users.id))
    .where(
      options?.before
        ? and(
            eq(activityLog.familyId, familyId),
            lt(activityLog.createdAt, options.before),
          )
        : eq(activityLog.familyId, familyId),
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return rows;
}
