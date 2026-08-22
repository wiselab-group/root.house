"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PersonAvatar } from "@/components/person/person-avatar";
import { Button } from "@/components/ui/button";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasAvatar = Boolean(person.photoMediaId);
  const isBusy = isUploading || isRemoving;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
      if (inputRef.current) inputRef.current.value = "";
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
    <div className="flex items-center gap-4">
      <PersonAvatar
        person={person}
        familyId={familyId}
        className="size-16! text-lg"
      />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          disabled={isBusy}
          className="hidden"
          id="avatar-upload-input"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            aria-busy={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading
              ? "Загружаем…"
              : hasAvatar
                ? "Изменить фото"
                : "Загрузить фото"}
          </Button>
          {hasAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              aria-busy={isRemoving}
              onClick={handleRemove}
            >
              {isRemoving ? "Удаляем…" : "Удалить"}
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
