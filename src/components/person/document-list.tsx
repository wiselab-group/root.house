"use client";

import { useOptimistic } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { DeleteDocumentButton } from "./delete-document-button";
import { PrivacyBadge } from "./privacy-badge";
import { documentFileType } from "./document-file-type";
import type { MediaRecord } from "@/domain/media/media.service";
import { mediaDownloadUrl } from "@/lib/media-url";

/** "1,2 МБ" / "480 KB" — Intl unit formatting in the viewer's language;
 *  documents run much larger than the KB-scale thumbnails elsewhere. */
function formatFileSize(
  bytes: number,
  format: ReturnType<typeof useFormatter>,
): string {
  const unit = (value: number, name: string, digits = 0) =>
    format.number(value, {
      style: "unit",
      unit: name,
      unitDisplay: "short",
      maximumFractionDigits: digits,
    });
  if (bytes < 1024) return unit(bytes, "byte");
  const kb = bytes / 1024;
  if (kb < 1024) return unit(kb, "kilobyte");
  return unit(kb / 1024, "megabyte", 1);
}

/**
 * A Person's document list (profile page's Документы section) — deliberately
 * NOT PhotoGrid: no lightbox, no drag-reorder, no per-item people-tagging —
 * a document is identified by its filename/type, not a visual thumbnail, so
 * a plain row list (icon + name + size + actions) fits better than a grid of
 * tiles. documentFileType picks the icon (PDF vs. scanned image) per mimeType.
 * Deletion is optimistic, same useOptimistic shape as PersonStoriesList.
 */
export function DocumentList({
  familyId,
  familySlug,
  documents,
}: {
  familyId: string;
  familySlug: string;
  documents: (MediaRecord & { canDelete: boolean })[];
}) {
  const format = useFormatter();
  const tDocs = useTranslations("documents");
  const [optimisticDocuments, removeOptimisticDocument] = useOptimistic(
    documents,
    (state, deletedMediaId: string) =>
      state.filter((doc) => doc.id !== deletedMediaId),
  );

  return (
    <ul className="flex flex-col divide-y divide-border">
      {optimisticDocuments.map((doc) => {
        const { Icon, label: typeLabel } = documentFileType(doc.mimeType);
        const label = typeLabel ?? tDocs("file");
        return (
          <li key={doc.id} className="flex items-center gap-3 py-3">
            <Icon
              className="size-8 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <a
              href={mediaDownloadUrl(doc.id, familyId)}
              className="flex min-w-0 flex-1 flex-col hover:underline"
            >
              <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                {doc.title || label}
                <PrivacyBadge privacyLevel={doc.privacyLevel} compact />
              </span>
              <span className="text-xs text-muted-foreground">
                {label} · {formatFileSize(doc.sizeBytes, format)}
              </span>
            </a>
            {doc.canDelete && (
              <DeleteDocumentButton
                familyId={familyId}
                familySlug={familySlug}
                mediaId={doc.id}
                onDeleted={() => removeOptimisticDocument(doc.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
