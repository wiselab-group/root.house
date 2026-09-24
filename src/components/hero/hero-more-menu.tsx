"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeletePersonButton } from "@/components/person/delete-person-button";
import { DeleteStoryDetailButton } from "@/components/story/delete-story-detail-button";
import { glassIconButton } from "./glass";

type DeleteTarget =
  | { kind: "person"; familyId: string; personId: string; name: string }
  | { kind: "story"; familyId: string; storyId: string; name: string };

/**
 * The hero's single «⋮» pill holding every page action (edit, delete) — by
 * explicit user request, so the top-right of the photo carries one quiet
 * control instead of a row of pills. Either action may be absent (an editor
 * who isn't the owner can edit a person but not delete them); with neither,
 * nothing renders. Delete only opens the existing confirm dialog (rendered
 * outside the menu, controlled here), so it still always asks first.
 */
export function HeroMoreMenu({
  editHref,
  deleteTarget,
}: {
  editHref?: string | null;
  deleteTarget?: DeleteTarget | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!editHref && !deleteTarget) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={glassIconButton}
              aria-label="Действия"
            />
          }
        >
          <MoreVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 min-w-52">
          {editHref && (
            <DropdownMenuItem render={<Link href={editHref} />}>
              <PencilIcon />
              Редактировать
            </DropdownMenuItem>
          )}
          {deleteTarget && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon />
              {deleteTarget.kind === "person"
                ? "Удалить человека"
                : "Удалить историю"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {deleteTarget?.kind === "person" && (
        <DeletePersonButton
          familyId={deleteTarget.familyId}
          personId={deleteTarget.personId}
          personName={deleteTarget.name}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={false}
        />
      )}
      {deleteTarget?.kind === "story" && (
        <DeleteStoryDetailButton
          familyId={deleteTarget.familyId}
          storyId={deleteTarget.storyId}
          storyTitle={deleteTarget.name}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={false}
        />
      )}
    </>
  );
}
