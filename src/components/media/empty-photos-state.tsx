import { ImagesIcon } from "lucide-react";

/** Same teaching-empty-state shape as /families, /people and /places — a
 *  concrete next step, not a bare "nothing here". On the unfiltered /photos
 *  page this only shows once there are no albums either (an album-only
 *  family with zero loose photos still has the album grid above to show for
 *  itself, so this would be redundant noise under it) — but inside a
 *  specific empty album (activeAlbumId set) it always shows regardless of
 *  the family's other albums, since a blank PhotoGrid with no explanation
 *  would otherwise render silently. Non-uploaders see plain copy with no
 *  dead-end CTA they can't act on — the header's own UploadPhotoDialog is
 *  the only upload entry point either way, so no button is duplicated here. */
export function EmptyPhotosState({ canUpload }: { canUpload: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ImagesIcon className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">
          Фотографий пока нет
        </h2>
        <p className="text-muted-foreground">
          {canUpload
            ? "Добавьте первое фото — со временем здесь соберётся семейный альбом."
            : "Когда кто-то из семьи добавит фото, они появятся здесь."}
        </p>
      </div>
    </div>
  );
}
