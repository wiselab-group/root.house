/**
 * Client-side helper for POSTing a document to /api/media/upload-document —
 * same shape as lib/upload-photo.ts's uploadPhoto, kept as a separate
 * function (not a shared helper branching on an endpoint param) since the
 * two routes take different form fields (personId is required here, always
 * exactly one; photos take personIds/albumIds arrays) and have no caller
 * that needs both behind one signature.
 */
export async function uploadDocument({
  familyId,
  personId,
  file,
  privacyLevel,
}: {
  familyId: string;
  personId: string;
  file: File;
  privacyLevel?: "private" | "family" | "public";
}): Promise<{ id: string }> {
  const formData = new FormData();
  formData.set("familyId", familyId);
  formData.set("personId", personId);
  if (privacyLevel) formData.set("privacyLevel", privacyLevel);
  formData.set("file", file);

  const response = await fetch("/api/media/upload-document", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Не удалось загрузить документ");
  }
  return response.json();
}
