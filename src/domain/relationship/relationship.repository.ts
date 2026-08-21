import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { relationshipsParentChild, relationshipsPartnership } from "@/db/schema";
import { fromColumns, toColumns, type PartialDate } from "@/domain/shared/partial-date";
import { deriveSiblings } from "./sibling-derivation";

export interface ParentChildRecord {
  id: string;
  familyId: string;
  parentId: string;
  childId: string;
  parentRole: "biological" | "adoptive" | "step" | "unknown";
}

export interface PartnershipRecord {
  id: string;
  familyId: string;
  person1Id: string;
  person2Id: string;
  status: "married" | "divorced" | "widowed" | "partnered" | "separated";
  startDate: PartialDate | null;
  endDate: PartialDate | null;
  isCurrent: boolean;
}

/** All parent_child rows where `personId` is the child — i.e. their direct parents. */
export async function getParentsOf(personId: string, familyId: string): Promise<ParentChildRecord[]> {
  const rows = await db.query.relationshipsParentChild.findMany({
    where: and(eq(relationshipsParentChild.childId, personId), eq(relationshipsParentChild.familyId, familyId)),
  });
  return rows;
}

/** All parent_child rows where `personId` is the parent — i.e. their direct children. */
export async function getChildrenOf(personId: string, familyId: string): Promise<ParentChildRecord[]> {
  const rows = await db.query.relationshipsParentChild.findMany({
    where: and(eq(relationshipsParentChild.parentId, personId), eq(relationshipsParentChild.familyId, familyId)),
  });
  return rows;
}

export async function getPartnershipsOf(personId: string, familyId: string): Promise<PartnershipRecord[]> {
  const rows = await db.query.relationshipsPartnership.findMany({
    where: and(
      eq(relationshipsPartnership.familyId, familyId),
      or(eq(relationshipsPartnership.person1Id, personId), eq(relationshipsPartnership.person2Id, personId)),
    ),
  });
  return rows.map((row) => ({
    id: row.id,
    familyId: row.familyId,
    person1Id: row.person1Id,
    person2Id: row.person2Id,
    status: row.status,
    isCurrent: row.isCurrent,
    startDate: fromColumns({
      year: row.startDateYear,
      month: row.startDateMonth,
      day: row.startDateDay,
      precision: row.startDatePrecision,
      approximate: row.startDateApproximate,
    }),
    endDate: fromColumns({
      year: row.endDateYear,
      month: row.endDateMonth,
      day: row.endDateDay,
      precision: row.endDatePrecision,
      approximate: row.endDateApproximate,
    }),
  }));
}

/**
 * Siblings are NEVER stored — derived via the pure deriveSiblings() algorithm
 * (see sibling-derivation.ts) over this family's full parent_child edge set.
 * Two people who share at least one parent are siblings; sharedParentCount
 * distinguishes full siblings (2 shared) from half-siblings (1 shared).
 */
export async function getSiblingsOf(
  personId: string,
  familyId: string,
): Promise<Array<{ personId: string; sharedParentCount: number }>> {
  const allEdges = await db.query.relationshipsParentChild.findMany({
    where: eq(relationshipsParentChild.familyId, familyId),
    columns: { parentId: true, childId: true },
  });
  return deriveSiblings(personId, allEdges);
}

export async function insertParentChild(input: {
  familyId: string;
  parentId: string;
  childId: string;
  parentRole?: "biological" | "adoptive" | "step" | "unknown";
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(relationshipsParentChild)
    .values({
      familyId: input.familyId,
      parentId: input.parentId,
      childId: input.childId,
      parentRole: input.parentRole ?? "biological",
    })
    .returning({ id: relationshipsParentChild.id });
  return row;
}

export async function insertPartnership(input: {
  familyId: string;
  person1Id: string;
  person2Id: string;
  status?: "married" | "divorced" | "widowed" | "partnered" | "separated";
  startDate?: PartialDate | null;
  endDate?: PartialDate | null;
  isCurrent?: boolean;
}): Promise<{ id: string }> {
  const startCols = toColumns(input.startDate ?? null);
  const endCols = toColumns(input.endDate ?? null);

  const [row] = await db
    .insert(relationshipsPartnership)
    .values({
      familyId: input.familyId,
      person1Id: input.person1Id,
      person2Id: input.person2Id,
      status: input.status ?? "partnered",
      isCurrent: input.isCurrent ?? true,
      startDateYear: startCols.year,
      startDateMonth: startCols.month,
      startDateDay: startCols.day,
      startDatePrecision: startCols.precision,
      startDateApproximate: startCols.approximate,
      endDateYear: endCols.year,
      endDateMonth: endCols.month,
      endDateDay: endCols.day,
      endDatePrecision: endCols.precision,
      endDateApproximate: endCols.approximate,
    })
    .returning({ id: relationshipsPartnership.id });
  return row;
}

export async function deleteParentChild(id: string, familyId: string): Promise<boolean> {
  const result = await db
    .delete(relationshipsParentChild)
    .where(and(eq(relationshipsParentChild.id, id), eq(relationshipsParentChild.familyId, familyId)))
    .returning({ id: relationshipsParentChild.id });
  return result.length > 0;
}

export async function deletePartnership(id: string, familyId: string): Promise<boolean> {
  const result = await db
    .delete(relationshipsPartnership)
    .where(and(eq(relationshipsPartnership.id, id), eq(relationshipsPartnership.familyId, familyId)))
    .returning({ id: relationshipsPartnership.id });
  return result.length > 0;
}
