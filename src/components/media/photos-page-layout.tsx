import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PhotoGrid } from "./photo-grid";
import { PhotoUploadPanel } from "./photo-upload-panel";
import { AlbumTabs } from "./album-tabs";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { CreateAlbumForm } from "@/components/forms/create-album-form";
import { DeleteAlbumButton } from "@/components/forms/delete-album-button";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * Shared page shell for /families/[slug]/photos and .../photos/[albumId] —
 * both pages are "browse a photo feed with album tabs above it", differing
 * only in which feed (whole family vs. one album) and whether an active
 * album is selected. Keeping this in one place avoids duplicating the
 * breadcrumbs/tabs/grid/upload-panel wiring between the two route files.
 */
export function PhotosPageLayout({
  familyId,
  familySlug,
  familyName,
  canEdit,
  albums,
  activeAlbumId,
  activeAlbumName,
  photos,
}: {
  familyId: string;
  familySlug: string;
  familyName: string;
  canEdit: boolean;
  albums: { id: string; name: string }[];
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  photos: GalleryPhotoView[];
}) {
  const pageTitle = activeAlbumName ?? "Фото";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={
          activeAlbumName
            ? [
                { label: "Мои семьи", href: "/families" },
                { label: familyName, href: `/families/${familySlug}` },
                { label: "Фото", href: `/families/${familySlug}/photos` },
                { label: activeAlbumName },
              ]
            : [
                { label: "Мои семьи", href: "/families" },
                { label: familyName, href: `/families/${familySlug}` },
                { label: "Фото" },
              ]
        }
      />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">{pageTitle}</h1>
        {!activeAlbumName && (
          <p className="text-muted-foreground">
            Все фотографии семьи в одном месте — те же снимки видны и в профилях
            отмеченных на них людей.
          </p>
        )}
      </div>

      <AlbumTabs
        familySlug={familySlug}
        albums={albums}
        activeAlbumId={activeAlbumId}
      />

      {photos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Фотографий пока нет</CardTitle>
            <CardDescription>Добавьте первое фото.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PhotoGrid
          photos={photos}
          familyId={familyId}
          familySlug={familySlug}
          canEdit={canEdit}
        />
      )}

      {canEdit && (
        <div className="flex flex-col gap-3">
          <CollapsibleForm triggerLabel="Добавить фото">
            <PhotoUploadPanel familyId={familyId} albums={albums} />
          </CollapsibleForm>
          <CollapsibleForm triggerLabel="Альбом">
            <CreateAlbumForm familyId={familyId} />
          </CollapsibleForm>
        </div>
      )}

      {activeAlbumId && canEdit && (
        <DeleteAlbumButton
          familyId={familyId}
          familySlug={familySlug}
          albumId={activeAlbumId}
        />
      )}
    </main>
  );
}
