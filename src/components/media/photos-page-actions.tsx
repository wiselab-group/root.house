import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { AlbumForm } from "@/components/forms/album-form";
import { PhotoUploadPanel } from "./photo-upload-panel";

/** "Добавить фото" / "+ Альбом" triggers at the bottom of the photos page — both open a form the user can back out of via Cancel. */
export function PhotosPageActions({
  familyId,
  albums,
  defaultAlbums,
}: {
  familyId: string;
  albums: { id: string; name: string }[];
  defaultAlbums: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <CollapsibleForm triggerLabel="Добавить фото">
        <PhotoUploadPanel
          familyId={familyId}
          albums={albums}
          defaultAlbums={defaultAlbums}
        />
      </CollapsibleForm>
      <CollapsibleForm triggerLabel="Альбом">
        <AlbumForm familyId={familyId} />
      </CollapsibleForm>
    </div>
  );
}
