"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PersonPhotoUpload } from "@/components/forms/person-photo-upload";
import { personInitials } from "@/domain/person/display-name";
import { removePersonAvatarAction } from "@/actions/media.actions";
import type { PersonRecord } from "@/domain/person/person.repository";

/**
 * Avatar as its own editing surface — deliberately separate from the photo
 * gallery (PersonMediaGallery): an avatar is "the one profile picture", not
 * one-of-many uploaded photos, so it gets its own upload/replace/remove
 * controls here rather than a "make avatar" button scattered across gallery
 * tiles. Upload goes through /api/media/upload with isAvatar=true (same
 * Route Handler as gallery photos — see its doc comment for why a Route
 * Handler and not a Server Action), which atomically replaces any previous
 * avatar Media row server-side.
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
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const previewUrl = person.photoMediaId
    ? `/api/media/${person.photoMediaId}?familyId=${familyId}`
    : null;

  async function handleFileSelect(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("familyId", familyId);
      formData.set("personId", personId);
      formData.set("file", file);
      formData.set("isAvatar", "true");

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Не удалось загрузить фото");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить фото",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    setError(null);
    startRemoveTransition(async () => {
      try {
        await removePersonAvatarAction(familyId, personId);
      } catch {
        setError("Не удалось удалить аватар");
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
        isBusy={isUploading || isRemoving}
        size="compact"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
