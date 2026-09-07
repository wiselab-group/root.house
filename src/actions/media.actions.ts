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
import {
  getAlbumsForSingleMedia,
  getTaggedPeopleForMedia,
  removeMedia,
} from "@/domain/media/media.service";

/**
 * Photo upload itself is NOT a Server Action — see app/api/media/upload/route.ts's
 * doc comment for why (private-blob access + file body size). Deletion has
 * no such constraint, so it's a normal action like every other remove/delete.
 *
 * `personId` is an optional hint (passed when deleting from a specific
 * person's profile gallery, for the avatar defense-in-depth check below) —
 * but which profile/album pages get revalidated is NOT limited to it. A
 * photo deleted from the family-wide gallery (/families/[slug]/photos) may
 * be tagged to several people (media_person) and belong to several albums
 * (media_album) at once — every one of those pages shows this same photo,
 * so all of them need revalidating, not just whichever person's page the
 * delete happened to be clicked from, otherwise the others keep showing
 * the now-deleted photo from Next's cache until they naturally re-render.
 */
export async function deleteMediaAction(
  familyId: string,
  familySlug: string,
  mediaId: string,
  personId?: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");

  // Fetched before removeMedia — media_person/media_album rows cascade-
  // delete with the Media row, so this must run first or there'd be
  // nothing left to find.
  const [taggedPeople, taggedAlbums] = await Promise.all([
    getTaggedPeopleForMedia(mediaId, familyId),
    getAlbumsForSingleMedia(mediaId, familyId),
  ]);

  if (personId) {
    // Avatars are never gallery photos (see media.service.ts::uploadPersonAvatar),
    // so this shouldn't match in practice — kept as defense-in-depth against a
    // dangling photoMediaId, since that column has no DB-level FK (db/schema/person.ts).
    const person = await getPerson(personId, familyId);
    if (person?.photoMediaId === mediaId) {
      await setPersonAvatar(personId, familyId, null);
    }
  }

  await removeMedia(mediaId, familyId);

  for (const person of taggedPeople) {
    revalidatePath(`/families/${familySlug}/people/${person.slug}`);
  }
  for (const album of taggedAlbums) {
    revalidatePath(`/families/${familySlug}/photos/${album.id}`);
  }
  revalidatePath(`/families/${familySlug}/photos`);
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
