"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ExternalLinkIcon, MoveIcon, XIcon } from "lucide-react";
import {
  setPhotoTagPositionAction,
  untagPhotoPointAction,
  removePhotoTagAction,
} from "@/actions/photo-tag.actions";
import { personDisplayName } from "@/domain/person/display-name";
import type { MediaTaggedPerson } from "@/domain/media/media.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagPersonCombobox } from "./tag-person-combobox";

type Point = { xPercent: number; yPercent: number };

/**
 * Overlay layer inside PhotoLightbox's image container — renders existing
 * tap-to-tag markers and, when `taggingMode` is on, catches taps to place
 * new ones. Coordinates are computed from the overlay div's own
 * getBoundingClientRect(), which occupies exactly the same box as the
 * object-contain <Image> next to it (both are absolutely positioned at
 * inset-0 within the same parent) — no dependency on media.width/height,
 * which nothing in this codebase populates yet.
 */
export function PhotoTagLayer({
  mediaId,
  people,
  taggingMode,
  canTag,
  familyId,
  familySlug,
}: {
  mediaId: string;
  people: MediaTaggedPerson[];
  taggingMode: boolean;
  canTag: boolean;
  familyId: string;
  familySlug: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [, startTransition] = useTransition();

  const positioned = people.filter(
    (person): person is MediaTaggedPerson & Point =>
      person.xPercent != null && person.yPercent != null,
  );

  function pointFromEvent(event: React.PointerEvent | React.MouseEvent): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    const xPercent = Math.min(
      100,
      Math.max(0, ((event.clientX - rect.left) / rect.width) * 100),
    );
    const yPercent = Math.min(
      100,
      Math.max(0, ((event.clientY - rect.top) / rect.height) * 100),
    );
    return { xPercent, yPercent };
  }

  function handleTapToPlace(event: React.MouseEvent) {
    if (!taggingMode || draggingPersonId) return;
    setPendingPoint(pointFromEvent(event));
  }

  function handleAssign(person: { id: string; name: string }) {
    if (!pendingPoint) return;
    const point = pendingPoint;
    setPendingPoint(null);
    startTransition(async () => {
      await setPhotoTagPositionAction(
        familyId,
        familySlug,
        mediaId,
        person.id,
        point.xPercent,
        point.yPercent,
      );
    });
  }

  function handleDragStart(
    event: React.PointerEvent<HTMLButtonElement>,
    personId: string,
  ) {
    if (!canTag) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPersonId(personId);
    setDragPoint(pointFromEvent(event));
  }

  function handleDragMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingPersonId) return;
    setDragPoint(pointFromEvent(event));
  }

  function handleDragEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingPersonId || !dragPoint) return;
    const personId = draggingPersonId;
    const point = dragPoint;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDraggingPersonId(null);
    setDragPoint(null);
    startTransition(async () => {
      await setPhotoTagPositionAction(
        familyId,
        familySlug,
        mediaId,
        personId,
        point.xPercent,
        point.yPercent,
      );
    });
  }

  function handleUntag(personId: string) {
    startTransition(async () => {
      await untagPhotoPointAction(familyId, familySlug, mediaId, personId);
    });
  }

  function handleRemove(personId: string) {
    startTransition(async () => {
      await removePhotoTagAction(familyId, familySlug, mediaId, personId);
    });
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onClick={handleTapToPlace}
      style={{ cursor: taggingMode ? "crosshair" : undefined }}
    >
      {positioned.map((person) => {
        const isDragging = draggingPersonId === person.id;
        const point = isDragging && dragPoint ? dragPoint : person;
        const name = personDisplayName(person);

        const marker = (
          <button
            type="button"
            aria-label={name}
            style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }}
            className="group absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={(e) => handleDragStart(e, person.id)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <span
              aria-hidden
              className="size-3.5 rounded-full border-2 border-background bg-primary shadow-md transition-transform motion-reduce:transition-none group-hover:scale-125 group-focus-visible:scale-125"
            />
            <span className="sr-only">{name}</span>
          </button>
        );

        if (!canTag) {
          return (
            <div key={person.id} title={name}>
              {marker}
            </div>
          );
        }

        return (
          <DropdownMenu key={person.id}>
            <DropdownMenuTrigger className="contents" render={marker} />
            <DropdownMenuContent align="center">
              <DropdownMenuItem
                render={
                  <Link
                    href={`/families/${familySlug}/people/${person.slug}`}
                  />
                }
              >
                <ExternalLinkIcon />
                Открыть профиль
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                <MoveIcon />
                Перетащите метку, чтобы переместить
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUntag(person.id)}>
                <XIcon />
                Снять точку
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleRemove(person.id)}
              >
                <XIcon />
                Убрать из фото
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      {pendingPoint && (
        <Popover
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setPendingPoint(null);
          }}
        >
          <PopoverTrigger
            className="absolute size-px -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${pendingPoint.xPercent}%`,
              top: `${pendingPoint.yPercent}%`,
            }}
            aria-hidden
            tabIndex={-1}
          />
          <PopoverContent className="w-64 p-2" align="center" sideOffset={12}>
            <TagPersonCombobox
              familyId={familyId}
              onSelect={handleAssign}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
