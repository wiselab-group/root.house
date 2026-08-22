"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import { removeMedia } from "@/domain/media/media.service";

/**
 * Photo upload itself is NOT a Server Action — see app/api/media/upload/route.ts's
 * doc comment for why (private-blob access + file body size). Deletion has
 * no such constraint, so it's a normal action like every other remove/delete.
 */
export async function deleteMediaAction(familyId: string, personId: string, mediaId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeMedia(mediaId, familyId);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}
