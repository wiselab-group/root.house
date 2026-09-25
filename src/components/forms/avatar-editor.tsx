"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PersonPhotoUpload } from "@/components/forms/person-photo-upload";
import { personInitials } from "@/domain/person/display-name";
import { removePersonAvatarAction } from "@/actions/media.actions";
import type { PersonRecord } from "@/domain/person/person.repository";
import { mediaUrl } from "@/lib/media-url";
import { uploadPhoto } from "@/lib/upload-photo";

/**
 * The portrait's upload/replace/remove control on the edit page. Portraits
 * are gallery photos (explicit user request — any photo can also be made the
 * portrait from the gallery's «Сделать портретом»): an upload here goes
 * through lib/upload-photo.ts with isAvatar (straight to Blob, then
 * /api/media/upload records it), lands in the person's gallery
 * and becomes the portrait. Removing only unsets the portrait — the photo
 * stays in the gallery.
 */
export function AvatarEditor({
  familyId,
  personId,
  person,
}: {
  familyId: string;
  personId: string;
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder" | "photoMediaId"
  >;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const previewUrl = person.photoMediaId
    ? mediaUrl(person.photoMediaId, familyId, "thumb")
    : null;

  async function handleFileSelect(file: File) {
    setProgress(0);
    setError(null);

    try {
      await uploadPhoto({
        familyId,
        personId,
        isAvatar: true,
        file,
        onProgress: setProgress,
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить фото",
      );
    } finally {
      setProgress(null);
    }
  }

  function handleRemove() {
    setError(null);
    startRemoveTransition(async () => {
      try {
        await removePersonAvatarAction(familyId, personId);
      } catch {
        setError("Не удалось убрать портрет");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <PersonPhotoUpload
        previewUrl={previewUrl}
        fallback={<span>{personInitials(person)}</span>}
        onFileSelect={handleFileSelect}
        onRemove={handleRemove}
        removeLabel="Убрать портрет"
        isBusy={progress !== null || isRemoving}
        progress={progress}
        size="compact"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
