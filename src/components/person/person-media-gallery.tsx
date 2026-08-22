import Image from "next/image";
import { getPersonGallery } from "@/domain/media/media.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadForm } from "@/components/forms/photo-upload-form";
import { DeleteMediaButton } from "@/components/forms/delete-media-button";

// A tiny solid warm-muted-tone PNG used as the blur placeholder — photos are
// served through our own authenticated /api/media/[id] route (see below),
// which Next.js's image optimizer can't treat as a cacheable static source,
// so `unoptimized` is required and a static blurDataURL is the only way to
// get a placeholder at all (no on-the-fly blur generation is possible here).
const BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGN49/wBHDEQxwEAZ3ArUaHgM3YAAAAASUVORK5CYII=";

/**
 * A Person's photo gallery — server component fetching its own data (same
 * pattern as PersonFamilyPanel/PersonTimeline). Images are served through
 * /api/media/[id] (never a raw Blob URL) so every view re-checks family
 * membership — there is no publicly guessable photo URL.
 */
export async function PersonMediaGallery({
  familyId,
  personId,
  canEdit,
}: {
  familyId: string;
  personId: string;
  canEdit: boolean;
}) {
  const photos = await getPersonGallery(personId, familyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Фотографии</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Фотографий пока нет.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md border border-border">
                <Image
                  src={`/api/media/${photo.id}?familyId=${familyId}`}
                  alt={photo.title ?? "Семейное фото"}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  unoptimized
                />
                {canEdit && (
                  <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <DeleteMediaButton familyId={familyId} personId={personId} mediaId={photo.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && <PhotoUploadForm familyId={familyId} personId={personId} />}
      </CardContent>
    </Card>
  );
}
