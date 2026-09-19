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
 *
 * The browser's upload-progress event only covers sending request bytes,
 * not the server-side work after (storing the blob, writing the DB row) —
 * on a fast connection/small file that send finishes in a fraction of a
 * second, so an unscaled progress bar jumps straight to 100% and then
 * stalls there while the server is still working. Scaling the real
 * upload.onprogress fraction into the 0-90% range and reserving the last
 * 10% for the actual server response keeps the bar's motion truthful: it's
 * always reporting a real, currently-in-flight phase, never a fake timer.
 */
const UPLOAD_PHASE_CEILING = 0.9;
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
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * UPLOAD_PHASE_CEILING);
      }
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
