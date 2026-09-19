/**
 * Shared client-side helper for POSTing a photo to /api/media/upload (a
 * Route Handler, not a Server Action — see that route's doc comment for
 * why: private-blob storage + multipart body size). Used by usePhotoBatchUpload
 * for both the person-profile gallery (always tags the one person, never
 * passes albumIds) and the family-wide gallery (may tag zero, one, or
 * several albums, never tags people at upload time).
 *
 * Uses XMLHttpRequest instead of fetch() only when `onProgress` is given —
 * fetch() has no upload-progress event, and AvatarEditor (the only other
 * caller of /api/media/upload) doesn't need a percentage, so it keeps the
 * simpler fetch() path directly instead of going through this helper.
 */
export async function uploadPhoto({
  familyId,
  personIds,
  albumIds = [],
  file,
  privacyLevel,
  onProgress,
}: {
  familyId: string;
  personIds: string[];
  albumIds?: string[];
  file: File;
  privacyLevel?: "private" | "family" | "public";
  onProgress?: (fraction: number) => void;
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

  if (!onProgress) {
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

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    xhr.onload = () => {
      let body: { id?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response falls through to the generic error below.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.id) {
        onProgress(1);
        resolve({ id: body.id });
      } else {
        reject(new Error(body.error ?? "Не удалось загрузить фото"));
      }
    };

    xhr.onerror = () => reject(new Error("Не удалось загрузить фото"));

    xhr.send(formData);
  });
}
