import {
  listActivityForFamily,
  recordActivity,
  type ActivityAction,
  type ActivityEntityType,
  type ActivityLogEntry,
  type RecordActivityData,
} from "./activity-log.repository";

export type { ActivityAction, ActivityEntityType, ActivityLogEntry };

/**
 * Records one activity-log entry. Swallows its own errors — a logging
 * failure (e.g. a transient DB hiccup) must never take down the mutation it
 * describes, so callers fire-and-forget this after their own write already
 * succeeded rather than awaiting it as a hard dependency.
 */
export async function logActivity(input: RecordActivityData): Promise<void> {
  try {
    await recordActivity(input);
  } catch (error) {
    console.error("Failed to record activity log entry:", error);
  }
}

export async function listActivityLog(
  familyId: string,
  options?: { limit?: number; before?: Date },
): Promise<ActivityLogEntry[]> {
  return listActivityForFamily(familyId, options);
}
