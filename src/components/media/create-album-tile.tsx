"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlbumForm } from "@/components/forms/album-form";

/**
 * "+ Новый альбом" tile — same aspect-square/rounded footprint as AlbumTile
 * so it sits in the grid as one more tile, not a stray button breaking the
 * row's rhythm, but a dashed border + centered plus (no cover photo, no
 * name/count underneath) reads as "create", not "open". Opens AlbumForm in
 * a centered Dialog rather than inline — an inline form here would either
 * blow out the tile's fixed aspect-square footprint or force the whole
 * grid to reflow around it, and unlike the old page-bottom collapsible
 * form this creation entry point now lives inside the grid itself.
 */
export function CreateAlbumTile({ familyId }: { familyId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
        <PlusIcon className="size-6" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-sm font-medium">Новый альбом</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый альбом</DialogTitle>
        </DialogHeader>
        <AlbumForm
          familyId={familyId}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
