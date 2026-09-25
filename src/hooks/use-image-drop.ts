"use client";

import { useCallback, useState, type DragEvent } from "react";
import { PHOTO_ACCEPT, PHOTO_MAX_BYTES } from "@/domain/media/upload-rules";

const DEFAULT_MAX_SIZE = PHOTO_MAX_BYTES;
const DEFAULT_ACCEPT = PHOTO_ACCEPT;

/**
 * Single-image drag&drop + click-to-pick state, shared by PersonPhotoUpload.
 * Deliberately narrower than a general multi-file upload hook (e.g. reui's
 * useFileUpload) — this app only ever needs one image at a time (a person's
 * avatar), so there's no files array, no maxFiles, no duplicate detection.
 */
export function useImageDrop({
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  onFile,
}: {
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = accept.split(",").map((type) => type.trim());

  const validate = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `Файл превышает максимальный размер ${Math.round(maxSize / (1024 * 1024))} МБ`;
      }
      const isAccepted = acceptedTypes.some((type) =>
        type.startsWith(".")
          ? file.name.toLowerCase().endsWith(type)
          : type.endsWith("/*")
            ? file.type.startsWith(type.slice(0, -1))
            : file.type === type,
      );
      if (!isAccepted) {
        return "Неподдерживаемый формат файла";
      }
      return null;
    },
    [acceptedTypes, maxSize],
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validate(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFile(file);
    },
    [validate, onFile],
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
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  return {
    isDragging,
    error,
    handleFile,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
