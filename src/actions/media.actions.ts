"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import {
  getPerson,
  getPersonSlugById,
  setPersonAvatar,
} from "@/domain/person/person.service";
import { removeMedia } from "@/domain/media/media.service";

/**
 * Photo upload itself is NOT a Server Action — see app/api/media/upload/route.ts's
 * doc comment for why (private-blob access + file body size). Deletion has
 * no such constraint, so it's a normal action like every other remove/delete.
 */
export async function deleteMediaAction(
  familyId: string,
  personId: string,
  mediaId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");

  // Avatars are never gallery photos (see media.service.ts::uploadPersonAvatar),
  // so this shouldn't match in practice — kept as defense-in-depth against a
  // dangling photoMediaId, since that column has no DB-level FK (db/schema/person.ts).
  const person = await getPerson(personId, familyId);
  if (person?.photoMediaId === mediaId) {
    await setPersonAvatar(personId, familyId, null);
  }

  await removeMedia(mediaId, familyId);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}

/**
 * Removes a Person's avatar — deletes the underlying Media row (the avatar
 * is its own upload, never a gallery photo, see media.service.ts::uploadPersonAvatar)
 * and clears photoMediaId. Uploading/replacing an avatar happens through
 * /api/media/upload (isAvatar=true), not this action — same reasoning as
 * deleteMediaAction's doc comment (file body needs a Route Handler).
 */
export async function removePersonAvatarAction(
  familyId: string,
  personId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const person = await getPerson(personId, familyId);
  const avatarMediaId = person?.photoMediaId ?? null;

  await setPersonAvatar(personId, familyId, null);
  if (avatarMediaId) {
    await removeMedia(avatarMediaId, familyId);
  }

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  revalidatePath(`/families/${familySlug}/people`);
  revalidatePath(`/families/${familySlug}/tree`);
  revalidatePath(`/families/${familySlug}/people/${personSlug}/edit`);
}
