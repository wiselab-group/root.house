"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Local-only photo picker for the "add person" form — unlike AvatarEditor
 * (src/components/forms/avatar-editor.tsx), there is no personId yet to
 * upload against, so this never touches /api/media/upload itself. It just
 * holds the picked File and hands it to the parent via onFileChange; the
 * parent (PersonForm's create-flow submit handler) uploads it as the
 * person's avatar right after the person record is created — see
 * PersonForm's own doc comment for the full sequencing.
 */
export function PersonPhotoPicker({
  onFileChange,
  disabled,
}: {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke the previous object URL whenever it's replaced or the component
  // unmounts — these are otherwise never garbage-collected by the browser.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    onFileChange(file);
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16!">
        {previewUrl && <AvatarImage src={previewUrl} alt="" />}
        <AvatarFallback>
          <Camera className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
          id="person-photo-input"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {previewUrl ? "Изменить фото" : "Добавить фото"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRemove}
            >
              Убрать
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
