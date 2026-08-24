import type { PartialDate } from "@/domain/shared/partial-date";
import {
  ensureUniqueSlug,
  isValidPersonSlugFormat,
  slugifyPerson,
} from "@/domain/person/slug";
import { reconcileLivingStatus } from "@/domain/person/reconcile-living-status";
import {
  createPerson,
  deletePerson,
  getPersonById,
  getPersonBySlug,
  isPersonSlugTaken,
  listPersonsByFamily,
  setProfilePhoto,
  updatePerson,
  updatePersonSlug,
  type PersonRecord,
  type UpdatePersonData,
} from "./person.repository";

export type { PersonRecord };

export class PersonSlugTakenError extends Error {
  constructor(
    message = "This slug is already used by someone else in this family.",
  ) {
    super(message);
    this.name = "PersonSlugTakenError";
  }
}

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
  birthPlaceId?: string;
  deathPlaceId?: string;
}

/** Placeholder id used only to seed a fallback slug before the real row (and
 *  its real id) exists yet — see generateUniquePersonSlug. */
function randomSeed(): string {
  return crypto.randomUUID();
}

async function generateUniquePersonSlug(
  familyId: string,
  source: Parameters<typeof slugifyPerson>[0],
): Promise<string> {
  const base = slugifyPerson(source, randomSeed());
  return ensureUniqueSlug(base, (candidate) =>
    isPersonSlugTaken(candidate, familyId),
  );
}

/** Ordinary Person creation — used by the "Add person" flow (adding yourself, a known relative, ...). */
export async function addPerson(
  familyId: string,
  createdBy: string,
  rawInput: CreatePersonInput,
): Promise<{ id: string; slug: string }> {
  const input = reconcileLivingStatus(rawInput);

  const slug = await generateUniquePersonSlug(familyId, {
    firstName: input.firstName,
    nickname: input.nickname,
    isPlaceholder: false,
  });

  const { id } = await createPerson({
    familyId,
    createdBy,
    slug,
    isPlaceholder: false,
    ...input,
  });

  return { id, slug };
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
  const slug = await generateUniquePersonSlug(familyId, {
    firstName: input.label,
    nickname: null,
    isPlaceholder: true,
  });

  return createPerson({
    familyId,
    createdBy,
    slug,
    isPlaceholder: true,
    firstName: input.label,
    gender: input.gender ?? "unknown",
    isLiving: true,
  });
}

export async function getPerson(
  personId: string,
  familyId: string,
): Promise<PersonRecord | null> {
  return getPersonById(personId, familyId);
}

/**
 * Resolves the /families/[familySlug]/people/[slug] URL segment to a
 * personId — NOT an access check, same contract as
 * domain/family/family.service.ts::getFamilyIdBySlug. Returns null for an
 * unknown slug so callers can 404 without leaking whether it ever existed.
 */
export async function getPersonIdBySlug(
  slug: string,
  familyId: string,
): Promise<string | null> {
  const person = await getPersonBySlug(slug, familyId);
  return person?.id ?? null;
}

/**
 * The inverse of getPersonIdBySlug — used by Server Actions that already
 * hold a validated personId (from a form/prop, after requireFamilyAccess)
 * and need to build a /families/[slug]/people/[slug]/... redirect or
 * revalidatePath target after a mutation. Not an access check either.
 */
export async function getPersonSlugById(
  personId: string,
  familyId: string,
): Promise<string | null> {
  const person = await getPersonById(personId, familyId);
  return person?.slug ?? null;
}

export async function listPeople(familyId: string): Promise<PersonRecord[]> {
  return listPersonsByFamily(familyId);
}

export async function editPerson(
  personId: string,
  familyId: string,
  rawPatch: UpdatePersonData,
): Promise<boolean> {
  return updatePerson(personId, familyId, reconcileLivingStatus(rawPatch));
}

/**
 * Changes a Person's own slug — caller must have already verified access
 * (requireFamilyAccess, 'editor' — the same level allowed to edit the
 * Person at all; unlike a family's slug, a person's slug isn't restricted
 * to 'owner', since it only affects a link scoped to that one person, not
 * everyone's bookmarks to the family root). Rejects malformed slugs and
 * slugs already taken by a *different* Person in the same family.
 */
export async function renamePersonSlug(
  personId: string,
  familyId: string,
  newSlug: string,
): Promise<void> {
  if (!isValidPersonSlugFormat(newSlug)) {
    throw new PersonSlugTakenError(
      "Ссылка может содержать только латинские буквы, цифры и дефис (2-64 символа).",
    );
  }

  const taken = await isPersonSlugTaken(newSlug, familyId, personId);
  if (taken) {
    throw new PersonSlugTakenError(
      "Эта ссылка уже занята другим человеком в этой семье.",
    );
  }

  await updatePersonSlug(personId, familyId, newSlug);
}

export async function removePerson(
  personId: string,
  familyId: string,
): Promise<boolean> {
  return deletePerson(personId, familyId);
}

/**
 * Sets (or clears, with mediaId=null) a Person's profile photo/avatar —
 * shown on the profile header, the /people list card, and as the tree node
 * thumbnail. The avatar is its own Media row, uploaded separately from (and
 * never shown in) the photo gallery — see media.service.ts::uploadPersonAvatar
 * and components/forms/avatar-editor.tsx. Returns false if the Person or the
 * Media doesn't exist in this family (family-scoped check happens in the
 * repository).
 */
export async function setPersonAvatar(
  personId: string,
  familyId: string,
  mediaId: string | null,
): Promise<boolean> {
  return setProfilePhoto(personId, familyId, mediaId);
}
