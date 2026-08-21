import { getPersonById } from "@/domain/person/person.repository";
import { isAncestorOf } from "./graph.service";
import {
  deleteParentChild,
  deletePartnership,
  getChildrenOf,
  getParentsOf,
  getPartnershipsOf,
  getSiblingsOf,
  insertParentChild,
  insertPartnership,
  type ParentChildRecord,
  type PartnershipRecord,
} from "./relationship.repository";
import type { PartialDate } from "@/domain/shared/partial-date";

export class RelationshipValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelationshipValidationError";
  }
}

export type ParentRole = "biological" | "adoptive" | "step" | "unknown";

/** Minimal shape of a Person lookup this service needs — injectable so
 *  validateParentChild is unit-testable without a live database. */
export type PersonExistsFn = (personId: string, familyId: string) => Promise<{ id: string } | null>;

/** Injectable ancestor-check — see PersonExistsFn. */
export type IsAncestorOfFn = (candidateAncestorId: string, personId: string, familyId: string) => Promise<boolean>;

/**
 * Pure validation for a proposed parent -> child edge: no DB writes, just the
 * rules that must hold before addParentChild() is allowed to insert one.
 * Split out from addParentChild so it can be unit-tested against fake
 * `personExists`/`isAncestorOf` implementations instead of a live database.
 */
export async function validateParentChild(
  familyId: string,
  input: { parentId: string; childId: string },
  deps: { personExists: PersonExistsFn; isAncestorOf: IsAncestorOfFn },
): Promise<void> {
  if (input.parentId === input.childId) {
    throw new RelationshipValidationError("Человек не может быть своим собственным родителем.");
  }

  const [parent, child] = await Promise.all([
    deps.personExists(input.parentId, familyId),
    deps.personExists(input.childId, familyId),
  ]);
  if (!parent || !child) {
    throw new RelationshipValidationError("Один из людей не найден в этой семье.");
  }

  // Would inserting parent->child make `parentId` a descendant of `childId`?
  // If childId is already an ancestor of parentId, this edge closes a cycle.
  const wouldCreateCycle = await deps.isAncestorOf(input.childId, input.parentId, familyId);
  if (wouldCreateCycle) {
    throw new RelationshipValidationError(
      "Эта связь создала бы цикл в родословной (человек не может быть предком самого себя).",
    );
  }
}

/**
 * Creates a parent -> child relationship after validateParentChild() passes.
 * More than two biological parents is unusual but not invalid (surrogacy,
 * uncertain records, ...) — callers may surface this as a soft warning in the
 * UI, but it is not rejected here.
 */
export async function addParentChild(
  familyId: string,
  input: { parentId: string; childId: string; parentRole?: ParentRole },
): Promise<{ id: string }> {
  await validateParentChild(familyId, input, {
    personExists: getPersonById,
    isAncestorOf,
  });

  return insertParentChild({
    familyId,
    parentId: input.parentId,
    childId: input.childId,
    parentRole: input.parentRole,
  });
}

export interface AddPartnershipInput {
  person1Id: string;
  person2Id: string;
  status?: PartnershipRecord["status"];
  startDate?: PartialDate | null;
  endDate?: PartialDate | null;
  isCurrent?: boolean;
}

/**
 * Pure validation for a proposed partnership — same rationale as
 * validateParentChild: no DB writes, unit-testable against a fake `personExists`.
 */
export async function validatePartnership(
  familyId: string,
  input: { person1Id: string; person2Id: string },
  deps: { personExists: PersonExistsFn },
): Promise<void> {
  if (input.person1Id === input.person2Id) {
    throw new RelationshipValidationError("Человек не может состоять в партнёрстве сам с собой.");
  }

  const [person1, person2] = await Promise.all([
    deps.personExists(input.person1Id, familyId),
    deps.personExists(input.person2Id, familyId),
  ]);
  if (!person1 || !person2) {
    throw new RelationshipValidationError("Один из людей не найден в этой семье.");
  }
}

/**
 * Creates a partnership (spouse/partner union). Deliberately allows multiple
 * rows for the same pair — a divorced-then-remarried couple is just two rows
 * with different dates, not a special "remarriage" flag.
 */
export async function addPartnership(
  familyId: string,
  input: AddPartnershipInput,
): Promise<{ id: string }> {
  await validatePartnership(familyId, input, { personExists: getPersonById });
  return insertPartnership({ familyId, ...input });
}

export async function removeParentChild(id: string, familyId: string): Promise<boolean> {
  return deleteParentChild(id, familyId);
}

export async function removePartnership(id: string, familyId: string): Promise<boolean> {
  return deletePartnership(id, familyId);
}

export interface FamilyOfPerson {
  parents: ParentChildRecord[];
  children: ParentChildRecord[];
  partnerships: PartnershipRecord[];
  siblings: Array<{ personId: string; sharedParentCount: number }>;
}

/** Everything needed to render a Person's "Family" panel in one call. */
export async function getFamilyOf(personId: string, familyId: string): Promise<FamilyOfPerson> {
  const [parents, children, partnerships, siblings] = await Promise.all([
    getParentsOf(personId, familyId),
    getChildrenOf(personId, familyId),
    getPartnershipsOf(personId, familyId),
    getSiblingsOf(personId, familyId),
  ]);
  return { parents, children, partnerships, siblings };
}
