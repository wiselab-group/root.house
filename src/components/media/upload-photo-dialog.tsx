"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhotoUploadPanel } from "./photo-upload-panel";

/**
 * «Добавить» (photos) primary action for the /photos page header — a filled
 * button (not the old page-bottom outline trigger) since uploading is the
 * action this whole page exists for, and it stays reachable without
 * scrolling past a long album/photo grid first (Google/Apple Photos both
 * keep upload pinned in the header). Opens PhotoUploadPanel in a Dialog
 * instead of inline: the panel doesn't self-close after a batch finishes
 * (its grid keeps showing the just-uploaded photos with checkmarks), so
 * `open` stays owned here and only its own Cancel/"Готово"/Escape/backdrop
 * closes it.
 */
export function UploadPhotoDialog({
  familyId,
  albums,
  defaultAlbums,
}: {
  familyId: string;
  albums: { id: string; name: string }[];
  defaultAlbums: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="shrink-0">
            <PlusIcon data-icon="inline-start" />
            Добавить
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить фото</DialogTitle>
        </DialogHeader>
        <PhotoUploadPanel
          familyId={familyId}
          albums={albums}
          defaultAlbums={defaultAlbums}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
