"use client";

import { XIcon, LoaderCircleIcon, CheckIcon } from "lucide-react";
import { documentFileType } from "./document-file-type";

export type QueuedDocument = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

/**
 * List of picked-but-not-yet-uploaded documents for DocumentUploadPanel —
 * media/photo-upload-grid.tsx's grid-of-thumbnails equivalent, but a row
 * list instead of a grid since there's no useful <img> preview for a PDF/
 * scan (documentFileType's icon stands in for it, same as DocumentList's
 * already-uploaded rows).
 */
export function DocumentUploadQueue({
  documents,
  onRemove,
}: {
  documents: QueuedDocument[];
  onRemove: (id: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {documents.map((doc) => {
        const { Icon } = documentFileType(doc.file.type);
        return (
          <li
            key={doc.id}
            className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
          >
            <Icon
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm">
              {doc.file.name}
            </span>
            {doc.status === "uploading" && (
              <LoaderCircleIcon
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-label="Загрузка…"
              />
            )}
            {doc.status === "done" && (
              <CheckIcon
                className="size-4 shrink-0 text-primary"
                aria-label="Загружено"
              />
            )}
            {doc.status === "error" && (
              <span className="shrink-0 text-xs text-destructive">
                {doc.error ?? "Ошибка"}
              </span>
            )}
            {doc.status === "queued" && (
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                aria-label={`Убрать ${doc.file.name}`}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
