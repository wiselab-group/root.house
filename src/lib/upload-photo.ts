/**
 * Shared client-side helper for POSTing a photo to /api/media/upload (a
 * Route Handler, not a Server Action — see that route's doc comment for
 * why: private-blob storage + multipart body size). Used by both the
 * single-person PhotoUploadForm (person profile gallery, never passes
 * albumIds) and the family-wide gallery's upload panel, which may tag
 * zero, one, or several people AND add the photo to zero, one, or several
 * albums at once.
 */
export async function uploadPhoto({
  familyId,
  personIds,
  albumIds = [],
  file,
  privacyLevel,
}: {
  familyId: string;
  personIds: string[];
  albumIds?: string[];
  file: File;
  privacyLevel?: "private" | "family" | "public";
}): Promise<{ id: string }> {
  const formData = new FormData();
  formData.set("familyId", familyId);
  for (const personId of personIds) {
    formData.append("personIds", personId);
  }
  for (const albumId of albumIds) {
    formData.append("albumIds", albumId);
  }
  if (privacyLevel) formData.set("privacyLevel", privacyLevel);
  formData.set("file", file);

  const response = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Не удалось загрузить фото");
  }
  return response.json();
}
