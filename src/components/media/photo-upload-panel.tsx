"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonMultiCombobox } from "./person-multi-combobox";
import { AlbumMultiCombobox } from "./album-multi-combobox";
import { uploadPhoto } from "@/lib/upload-photo";

/**
 * Upload panel for the family-wide gallery (/families/[slug]/photos) —
 * unlike the person-profile PhotoUploadForm (always exactly one person,
 * never albumed), this lets a photo be tagged with zero, one, or several
 * people AND added to zero, one, or several albums before it's uploaded.
 * Shares the actual fetch() call with PhotoUploadForm via lib/upload-photo.ts.
 */
export function PhotoUploadPanel({
  familyId,
  albums,
}: {
  familyId: string;
  /** The family's existing albums, for AlbumMultiCombobox — fetched once by the parent page, not re-fetched per upload. */
  albums: { id: string; name: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [taggedPeople, setTaggedPeople] = useState<
    { id: string; name: string }[]
  >([]);
  const [taggedAlbums, setTaggedAlbums] = useState<
    { id: string; name: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadPhoto({
        familyId,
        personIds: taggedPeople.map((person) => person.id),
        albumIds: taggedAlbums.map((album) => album.id),
        file,
      });
      setTaggedPeople([]);
      setTaggedAlbums([]);
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        id="family-photo-upload-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        aria-busy={isUploading}
        onClick={() => inputRef.current?.click()}
        className="self-start"
      >
        {isUploading ? "Загружаем…" : "Выбрать фото"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
