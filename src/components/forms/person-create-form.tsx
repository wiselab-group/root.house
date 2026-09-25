"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PersonForm } from "./person-form";
import { PersonPhotoPicker } from "./person-photo-picker";
import { createPersonAction } from "@/actions/person.actions";
import type { PlaceRecord } from "@/domain/place/place.service";
import { uploadPhoto } from "@/lib/upload-photo";

/**
 * Wraps PersonForm for the "add person" flow only — adds an optional photo
 * picker above the fields and owns the custom submit sequencing that makes
 * "add a photo while creating" possible at all:
 *
 *   1. Run createPersonAction (no redirect() inside it anymore — see its own
 *      doc comment) and read back the new person's id.
 *   2. If a photo was picked, upload it now via the same uploadPhoto
 *      helper AvatarEditor uses (isAvatar) — this is the earliest point
 *      a personId exists to upload against.
 *   3. Only then navigate to the new profile page (router.push, replacing
 *      the redirect() the action used to do itself) — so the avatar is
 *      already set by the time the profile renders, not applied a moment
 *      later behind a second page load.
 *
 * Kept separate from PersonForm (which stays plain/reusable for the edit
 * flow, still using the ordinary useActionState+redirect() pattern via
 * updatePersonAction) rather than folding this in directly — PersonForm is
 * already near CLAUDE.md's 150-line component ceiling, and edit's flow has
 * no equivalent "upload before navigating" need since AvatarEditor there
 * already has a real personId to work with independently of this form.
 */
export function PersonCreateForm({
  familyId,
  familySlug,
  places,
}: {
  familyId: string;
  familySlug: string;
  places: PlaceRecord[];
}) {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);
  const [isNavigating, startNavigateTransition] = useTransition();
  // PersonForm renders its own pending state from useActionState/
  // useFormStatus; this ref lets the wrapper's action intercept the same
  // submit to run the extra upload+navigate steps after the action itself
  // resolves, without duplicating PersonForm's field markup here.
  const pendingFileRef = useRef<File | null>(null);

  async function boundAction(
    prevState: Awaited<ReturnType<typeof createPersonAction>>,
    formData: FormData,
  ) {
    pendingFileRef.current = photoFile;
    const result = await createPersonAction(familyId, prevState, formData);

    if (result.created) {
      const { personId, personSlug, familySlug } = result.created;
      const fileToUpload = pendingFileRef.current;

      if (fileToUpload) {
        setPhotoError(null);
        setPhotoProgress(0);
        try {
          await uploadPhoto({
            familyId,
            personId,
            isAvatar: true,
            file: fileToUpload,
            onProgress: setPhotoProgress,
          });
        } catch {
          // Person was created successfully — a failed avatar upload
          // shouldn't block navigation or look like the whole submit
          // failed, just surface it and let the profile page's own
          // AvatarEditor be the fallback path to try again.
          setPhotoError(
            "Человек создан, но фото загрузить не удалось — добавьте его на странице редактирования.",
          );
        } finally {
          setPhotoProgress(null);
        }
      }

      startNavigateTransition(() => {
        router.push(`/families/${familySlug}/people/${personSlug}`);
        // The avatar upload above happened via a plain fetch() to a Route
        // Handler, entirely outside Next's own mutation tracking — so the
        // Router Cache has no way to know the profile page it's about to
        // navigate to is now stale. Without this, router.push can serve an
        // already-prefetched (pre-upload) RSC payload for the new URL and
        // the profile renders with the old "no avatar" state until a
        // manual reload (caught live: DB had the right photoMediaId the
        // whole time, only the first paint was stale). router.refresh()
        // forces a fresh server render of whatever the current route ends
        // up being, right after the push.
        router.refresh();
      });
      return {};
    }

    return result;
  }

  return (
    <div className="flex flex-col gap-6">
      <PersonPhotoPicker
        onFileChange={setPhotoFile}
        disabled={isNavigating}
        progress={photoProgress}
      />
      {photoError && <p className="text-sm text-destructive">{photoError}</p>}
      <PersonForm
        action={boundAction}
        places={places}
        submitLabel="Добавить"
        submitPendingLabel={
          photoProgress !== null
            ? `Загружаем фото… ${Math.round(photoProgress * 100)}%`
            : isNavigating
              ? "Открываем профиль…"
              : "Добавляем…"
        }
        cancelHref={`/families/${familySlug}/people`}
      />
    </div>
  );
}
