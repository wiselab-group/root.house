"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { createAlbumSchema } from "@/lib/validation/album";
import { addAlbum, editAlbum, removeAlbum } from "@/domain/album/album.service";

export interface AlbumFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createAlbumAction(
  familyId: string,
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createAlbumSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await addAlbum({
    familyId,
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/photos`);
  return {};
}

export async function updateAlbumAction(
  familyId: string,
  albumId: string,
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createAlbumSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const updated = await editAlbum(albumId, familyId, {
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });
  if (!updated) return { error: "Альбом не найден." };

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/photos`);
  revalidatePath(`/families/${slug}/photos/${albumId}`);
  return {};
}

/**
 * Deletes the Album itself, not the photos inside it (see
 * album.repository.ts::deleteAlbum) — /photos/[albumId] naturally 404s
 * afterward via getAlbum's IDOR-safe lookup, no separate handling needed.
 */
export async function deleteAlbumAction(
  familyId: string,
  albumId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeAlbum(albumId, familyId);

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/photos`);
  revalidatePath(`/families/${slug}/photos/${albumId}`);
}
