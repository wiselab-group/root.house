"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import {
  MicIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeletePersonButton } from "@/components/person/delete-person-button";
import { DeleteStoryDetailButton } from "@/components/story/delete-story-detail-button";
import {
  StoryRecorder,
  type StoryRecordTarget,
} from "@/components/story/listen/story-recorder";
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
 * On a story, whoever may edit it also gets «Начитать своим голосом»,
 * which opens the full-screen recorder (StoryRecorder) the same way.
 */
export function HeroMoreMenu({
  editHref,
  deleteTarget,
  record,
}: {
  editHref?: string | null;
  deleteTarget?: DeleteTarget | null;
  record?: StoryRecordTarget | null;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("hero");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  if (!editHref && !deleteTarget && !record) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              // Stays lit while the menu is open, so the menu reads as this
              // button's even after the pointer has moved into it.
              className={`${glassIconButton} data-popup-open:bg-background/70`}
              aria-label={t("actions")}
            />
          }
        >
          <MoreVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 min-w-52">
          {editHref && (
            <DropdownMenuItem render={<Link href={editHref} />}>
              <PencilIcon />
              {tc("edit")}
            </DropdownMenuItem>
          )}
          {record && (
            <DropdownMenuItem onClick={() => setRecordOpen(true)}>
              <MicIcon />
              {t("recordStory")}
            </DropdownMenuItem>
          )}
          {(editHref || record) && deleteTarget && <DropdownMenuSeparator />}
          {deleteTarget && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon />
              {deleteTarget.kind === "person"
                ? t("deletePerson")
                : t("deleteStory")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {record && (
        <StoryRecorder
          target={record}
          open={recordOpen}
          onOpenChange={setRecordOpen}
        />
      )}
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
