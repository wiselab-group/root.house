"use client";

import { useCallback, useState, type DragEvent } from "react";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

/**
 * Multi-image drag&drop + click-to-pick state, for the family gallery's
 * upload panel — unlike useImageDrop (avatar, always exactly one file),
 * this accumulates a `files` array across multiple drops/picks and
 * validates each file independently, so one oversized/wrong-type file in a
 * batch doesn't block the rest.
 */
export function useMultiImageDrop({
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  onFiles,
}: {
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = accept.split(",").map((type) => type.trim());

  const validate = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `«${file.name}» превышает максимальный размер ${Math.round(maxSize / (1024 * 1024))} МБ`;
      }
      const isAccepted = acceptedTypes.some((type) =>
        type.endsWith("/*")
          ? file.type.startsWith(type.slice(0, -1))
          : file.type === type,
      );
      if (!isAccepted) {
        return `«${file.name}» — неподдерживаемый формат файла`;
      }
      return null;
    },
    [acceptedTypes, maxSize],
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const valid: File[] = [];
      let firstError: string | null = null;

      for (const file of files) {
        const validationError = validate(file);
        if (validationError) {
          firstError ??= validationError;
        } else {
          valid.push(file);
        }
      }

      setError(firstError);
      if (valid.length > 0) onFiles(valid);
    },
    [validate, onFiles],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  return {
    isDragging,
    error,
    handleFiles,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
