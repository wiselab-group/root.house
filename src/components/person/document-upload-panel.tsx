"use client";

import { DocumentDropzone } from "./document-dropzone";
import { DocumentUploadQueue } from "./document-upload-queue";
import { useDocumentBatchUpload } from "./use-document-batch-upload";

/**
 * Upload panel for a person's Документы section — same
 * drag&drop-starts-upload-immediately shape as PersonPhotoUploadPanel, see
 * its own doc comment for why autoUpload + router.refresh() is used instead
 * of a manual confirm step.
 */
export function DocumentUploadPanel({
  familyId,
  personId,
}: {
  familyId: string;
  personId: string;
}) {
  const { documents, isUploading, addFiles, removeDocument } =
    useDocumentBatchUpload(familyId, personId);

  return (
    <div className="flex flex-col gap-3">
      <DocumentDropzone disabled={isUploading} onFiles={addFiles} />
      <DocumentUploadQueue documents={documents} onRemove={removeDocument} />
    </div>
  );
}
