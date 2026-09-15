"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { PersonPhotoUpload } from "@/components/forms/person-photo-upload";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke the previous object URL whenever it's replaced or the component
  // unmounts — these are otherwise never garbage-collected by the browser.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelect(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    onFileChange(file);
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onFileChange(null);
  }

  return (
    <PersonPhotoUpload
      previewUrl={previewUrl}
      fallback={<UserRound className="size-6 text-current" strokeWidth={1.5} />}
      onFileSelect={handleFileSelect}
      onRemove={handleRemove}
      disabled={disabled}
    />
  );
}
