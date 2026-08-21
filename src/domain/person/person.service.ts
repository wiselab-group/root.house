import type { PartialDate } from "@/domain/shared/partial-date";
import {
  createPerson,
  deletePerson,
  getPersonById,
  listPersonsByFamily,
  updatePerson,
  type PersonRecord,
  type UpdatePersonData,
} from "./person.repository";

export type { PersonRecord };

export interface CreatePersonInput {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  maidenName?: string;
  nickname?: string;
  gender?: "male" | "female" | "unknown" | "other";
  isLiving?: boolean;
  description?: string;
  religion?: string;
  nationality?: string;
  birthDate?: PartialDate;
  deathDate?: PartialDate;
}

/** Ordinary Person creation — used by the "Add person" flow (adding yourself, a known relative, ...). */
export async function addPerson(
  familyId: string,
  createdBy: string,
  input: CreatePersonInput,
): Promise<{ id: string }> {
  return createPerson({
    familyId,
    createdBy,
    isPlaceholder: false,
    ...input,
  });
}

/**
 * Creates a placeholder Person — the representation for "we know a child
 * existed but not their name", "an unknown parent", etc. Deliberately takes
 * almost nothing: a placeholder is valid with zero identifying information.
 * `label` is stored as `firstName` purely as a display hint (e.g. "unnamed son");
 * it does not imply the name is actually known.
 */
export async function addPlaceholderPerson(
  familyId: string,
  createdBy: string,
  input: { label?: string; gender?: "male" | "female" | "unknown" | "other" },
): Promise<{ id: string }> {
  return createPerson({
    familyId,
    createdBy,
    isPlaceholder: true,
    firstName: input.label,
    gender: input.gender ?? "unknown",
    isLiving: true,
  });
}

export async function getPerson(personId: string, familyId: string): Promise<PersonRecord | null> {
  return getPersonById(personId, familyId);
}

export async function listPeople(familyId: string): Promise<PersonRecord[]> {
  return listPersonsByFamily(familyId);
}

export async function editPerson(
  personId: string,
  familyId: string,
  patch: UpdatePersonData,
): Promise<boolean> {
  return updatePerson(personId, familyId, patch);
}

export async function removePerson(personId: string, familyId: string): Promise<boolean> {
  return deletePerson(personId, familyId);
}
