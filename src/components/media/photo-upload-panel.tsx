"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonMultiCombobox } from "./person-multi-combobox";
import { AlbumMultiCombobox } from "./album-multi-combobox";
import { PhotoPreviewCard } from "./photo-preview-card";
import { uploadPhoto } from "@/lib/upload-photo";
import { useCollapsibleFormClose } from "@/components/forms/collapsible-form";

/**
 * Upload panel for the family-wide gallery (/families/[slug]/photos) —
 * unlike the person-profile PhotoUploadForm (always exactly one person,
 * never albumed), this lets a photo be tagged with zero, one, or several
 * people AND added to zero, one, or several albums before it's uploaded.
 * Picking a file only stages it (PhotoPreviewCard) — tags stay editable
 * until "Загрузить" is pressed, so nothing is sent to the server the
 * moment the OS file picker closes. Shares the actual fetch() call with
 * PhotoUploadForm via lib/upload-photo.ts.
 */
export function PhotoUploadPanel({
  familyId,
  albums,
  defaultAlbums = [],
}: {
  familyId: string;
  /** The family's existing albums, for AlbumMultiCombobox — fetched once by the parent page, not re-fetched per upload. */
  albums: { id: string; name: string }[];
  /** Pre-selected albums — e.g. the album this panel is rendered inside of on /photos/[albumId], so an upload from that page defaults to landing in it. */
  defaultAlbums?: { id: string; name: string }[];
}) {
  const router = useRouter();
  // Collapses the whole panel back to its trigger button — offered next to
  // "Выбрать фото" only, since a staged file already has its own Cancel via
  // PhotoPreviewCard.
  const close = useCollapsibleFormClose();
  const inputRef = useRef<HTMLInputElement>(null);
  const [taggedPeople, setTaggedPeople] = useState<
    { id: string; name: string }[]
  >([]);
  const [taggedAlbums, setTaggedAlbums] =
    useState<{ id: string; name: string }[]>(defaultAlbums);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingFile(file);
  }

  function cancel() {
    setPendingFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirm() {
    if (!pendingFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadPhoto({
        familyId,
        personIds: taggedPeople.map((person) => person.id),
        albumIds: taggedAlbums.map((album) => album.id),
        file: pendingFile,
      });
      setTaggedPeople([]);
      setTaggedAlbums(defaultAlbums);
      setPendingFile(null);
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

  return (
    <div className="flex flex-col gap-3">
      <PersonMultiCombobox
        familyId={familyId}
        label="Кто на фото (необязательно)"
        value={taggedPeople}
        onChange={setTaggedPeople}
      />
      <AlbumMultiCombobox
        albums={albums}
        value={taggedAlbums}
        onChange={setTaggedAlbums}
      />

      {pendingFile ? (
        <PhotoPreviewCard
          file={pendingFile}
          isUploading={isUploading}
          error={error}
          onConfirm={confirm}
          onCancel={cancel}
        />
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFileChange}
            className="hidden"
            id="family-photo-upload-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Выбрать фото
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}
