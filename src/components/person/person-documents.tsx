import {
  getPersonDocuments,
  filterVisibleMedia,
} from "@/domain/media/media.service";
import { canDelete, type ActingMember } from "@/domain/family/permissions";
import { DocumentList } from "./document-list";
import { DocumentUploadPanel } from "./document-upload-panel";
import { ProfileSectionWithAdd } from "./profile-section-with-add";

/**
 * A Person's documents (scans/PDFs — certificates, letters, ...) — server
 * component, same fetch-then-filter-then-render pattern as
 * PersonMediaGallery/PersonStories. Kept as its own section (not folded into
 * PersonMediaGallery/PhotoGrid) since a document has no thumbnail, no
 * lightbox, no per-item people-tagging — see DocumentList's own doc comment.
 */
export async function PersonDocuments({
  familyId,
  familySlug,
  personId,
  canContribute,
  member,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  /** May upload documents — owner/editor/contributor (see
   *  domain/family/permissions.ts::canCreate). */
  canContribute: boolean;
  member: ActingMember;
}) {
  const allDocuments = await getPersonDocuments(personId, familyId);
  const documents = filterVisibleMedia(allDocuments, member);

  return (
    <ProfileSectionWithAdd
      title="Документы"
      count={documents.length}
      addLabel="Добавить документ"
      closeLabel="Закрыть"
      form={
        canContribute && (
          <DocumentUploadPanel familyId={familyId} personId={personId} />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Документов пока нет.</p>
        ) : (
          <DocumentList
            familyId={familyId}
            familySlug={familySlug}
            documents={documents.map((doc) => ({
              ...doc,
              canDelete: canDelete(member, {
                privacyLevel: doc.privacyLevel,
                createdBy: doc.uploadedBy,
              }),
            }))}
          />
        )}
      </div>
    </ProfileSectionWithAdd>
  );
}
