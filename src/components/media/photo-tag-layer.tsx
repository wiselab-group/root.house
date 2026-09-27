"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  CircleDashedIcon,
  ExternalLinkIcon,
  MoveIcon,
  XIcon,
} from "lucide-react";
import {
  setPhotoTagPositionAction,
  untagPhotoPointAction,
  removePhotoTagAction,
} from "@/actions/photo-tag.actions";
import { personDisplayName } from "@/domain/person/display-name";
import type { MediaTaggedPerson } from "@/domain/media/media.service";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhotoTagSpotlight } from "./photo-tag-spotlight";
import {
  PhotoTagCircle,
  PhotoTagRadiusEditor,
  startingRadius,
} from "./photo-tag-radius-editor";
import { TagReticle } from "./photo-tag-reticle";
import { TagPersonCombobox } from "./tag-person-combobox";

type Point = { xPercent: number; yPercent: number };

function pointFromEvent(
  event: { clientX: number; clientY: number },
  container: HTMLElement,
): Point {
  const rect = container.getBoundingClientRect();
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

/**
 * The tagging-mode pointer-follow marker (a preview of where a tap will
 * place a tag) — a separate piece since it owns its own ref/DOM mutation
 * loop (direct style writes on mousemove, not React state, to avoid a
 * re-render per pixel of movement — see PhotoTagLayer's own handlers for
 * the same pattern on drag). Returns the handlers to spread onto the
 * pointer-tracking container plus the marker element itself.
 */
function useTagCursorMarker(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const markerRef = useRef<HTMLDivElement>(null);

  function onMouseMove(event: React.MouseEvent) {
    if (!enabled || !markerRef.current || !containerRef.current) return;
    const point = pointFromEvent(event, containerRef.current);
    markerRef.current.hidden = false;
    markerRef.current.style.left = `${point.xPercent}%`;
    markerRef.current.style.top = `${point.yPercent}%`;
  }

  function onMouseLeave() {
    if (markerRef.current) markerRef.current.hidden = true;
  }

  return {
    onMouseMove,
    onMouseLeave,
    element: enabled && (
      <div
        ref={markerRef}
        aria-hidden
        hidden
        className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        <TagReticle shown />
      </div>
    ),
  };
}

/**
 * Drag-to-move plus untag/remove for the already-placed markers — the
 * per-person mutation lifecycle, separate from tap-to-place-a-new-tag
 * (which PhotoTagLayer keeps, since it also owns the popover that assigns
 * a person to a fresh point).
 */
function useTagDrag(
  containerRef: RefObject<HTMLDivElement | null>,
  canTag: boolean,
  taggingMode: boolean,
  {
    familyId,
    familySlug,
    mediaId,
  }: {
    familyId: string;
    familySlug: string;
    mediaId: string;
  },
) {
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [, startTransition] = useTransition();
  // Where a marker was just dropped, held until the save's revalidation
  // brings the new position back as props — without it the marker snapped
  // back to its old spot for a second or two after release, which read as
  // «the point can't be moved».
  const [droppedPoints, setDroppedPoint] = useOptimistic(
    {} as Record<string, Point>,
    (state, drop: { personId: string; point: Point }) => ({
      ...state,
      [drop.personId]: drop.point,
    }),
  );

  function onDragStart(
    event: React.PointerEvent<HTMLButtonElement>,
    personId: string,
  ) {
    if (!canTag || !taggingMode) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPersonId(personId);
    setDragPoint(pointFromEvent(event, containerRef.current!));
  }

  function onDragMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingPersonId) return;
    setDragPoint(pointFromEvent(event, containerRef.current!));
  }

  function onDragEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingPersonId || !dragPoint) return;
    const personId = draggingPersonId;
    const point = dragPoint;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDraggingPersonId(null);
    setDragPoint(null);
    startTransition(async () => {
      setDroppedPoint({ personId, point });
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

  function onUntag(personId: string) {
    startTransition(async () => {
      await untagPhotoPointAction(familyId, familySlug, mediaId, personId);
    });
  }

  function onRemove(personId: string) {
    startTransition(async () => {
      await removePhotoTagAction(familyId, familySlug, mediaId, personId);
    });
  }

  return {
    draggingPersonId,
    dragPoint,
    droppedPoints,
    setDroppedPoint,
    onDragStart,
    onDragMove,
    onDragEnd,
    onUntag,
    onRemove,
  };
}

/**
 * Overlay layer inside LightboxSlide's photo frame — renders existing
 * tap-to-tag markers and, when `taggingMode` is on, catches taps to place
 * new ones. Coordinates are percentages of the overlay div's own
 * getBoundingClientRect(), and that div fills the frame LightboxSlide sizes
 * to the photo's visible rectangle — so a point means the same spot on the
 * photo at any window shape (see LightboxSlide for the letterbox bug this
 * replaced).
 */
export function PhotoTagLayer({
  mediaId,
  people,
  taggingMode,
  canTag,
  familyId,
  familySlug,
  highlightedPersonId,
}: {
  mediaId: string;
  people: MediaTaggedPerson[];
  taggingMode: boolean;
  canTag: boolean;
  familyId: string;
  familySlug: string;
  /** Hovering/focusing a person's chip in TaggedPeopleStrip (outside
   *  taggingMode) briefly reveals just their marker — see the `marker`
   *  visibility logic below. */
  highlightedPersonId?: string | null;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  // A freshly tapped point: its spotlight circle is already out to size,
  // with the person search under it — both picked in one step.
  const [pending, setPending] = useState<{
    point: Point;
    radius: number;
  } | null>(null);
  if (!taggingMode && pending) setPending(null);
  const [, startTransition] = useTransition();
  const coarsePointer = useCoarsePointer();
  const drag = useTagDrag(containerRef, canTag, taggingMode, {
    familyId,
    familySlug,
    mediaId,
  });
  // An existing tag whose spotlight size is being changed
  // (PhotoTagRadiusEditor, from the marker's «Изменить область»).
  const [editing, setEditing] = useState<{
    personId: string;
    radius: number;
    point: Point;
    name: string;
  } | null>(null);
  if (!taggingMode && editing) setEditing(null);
  // A just-picked size, held until revalidation brings it back as props
  // (same reason as useTagDrag's droppedPoints).
  const [savedRadii, setSavedRadius] = useOptimistic(
    {} as Record<string, number>,
    (state, saved: { personId: string; radius: number }) => ({
      ...state,
      [saved.personId]: saved.radius,
    }),
  );
  const showCursorMarker =
    taggingMode &&
    !coarsePointer &&
    !drag.draggingPersonId &&
    !editing &&
    !pending;
  const cursorMarker = useTagCursorMarker(containerRef, showCursorMarker);

  const positioned = people.filter(
    (person): person is MediaTaggedPerson & Point =>
      person.xPercent != null && person.yPercent != null,
  );
  // Only while browsing — in taggingMode every marker is out and the photo
  // must stay fully visible to place new ones.
  const pointOf = (person: MediaTaggedPerson & Point): Point =>
    drag.draggingPersonId === person.id && drag.dragPoint
      ? drag.dragPoint
      : (drag.droppedPoints[person.id] ?? person);
  const radiusOf = (person: MediaTaggedPerson) =>
    savedRadii[person.id] ?? person.radiusPercent;
  const highlighted = taggingMode
    ? null
    : (positioned.find((person) => person.id === highlightedPersonId) ?? null);
  const spotlit = highlighted && {
    ...pointOf(highlighted),
    radiusPercent: radiusOf(highlighted),
  };

  function handleTapToPlace(event: React.MouseEvent) {
    // Popover/DropdownMenu content is rendered via a portal, but React's
    // synthetic event system still bubbles clicks from inside it up through
    // the React tree (not just the DOM tree) to this container's onClick —
    // without this guard, selecting a person in the just-opened popover (a
    // React descendant of this div despite living elsewhere in the DOM)
    // also re-triggers a NEW tap-to-place at the same screen position the
    // instant the first popover closes, immediately opening an empty one on
    // top of the marker that was just placed. Only an actual click directly
    // on this div (never bubbled from a portaled descendant) should count.
    if (event.target !== event.currentTarget) return;
    if (!taggingMode || drag.draggingPersonId) return;
    // A tap on the photo while resizing an existing tag keeps the size.
    if (editing) {
      commitRadius();
      return;
    }
    const point = pointFromEvent(event, containerRef.current!);
    // A tap elsewhere while a new point is out just moves it, size kept.
    setPending((current) => ({
      point,
      radius:
        current?.radius ??
        startingRadius(point, positioned, containerRef.current!),
    }));
  }

  function commitRadius() {
    if (!editing) return;
    const { personId, radius, point } = editing;
    setEditing(null);
    // The circle may have been moved as well as resized — one upsert saves
    // both.
    startTransition(async () => {
      setSavedRadius({ personId, radius });
      drag.setDroppedPoint({ personId, point });
      await setPhotoTagPositionAction(
        familyId,
        familySlug,
        mediaId,
        personId,
        point.xPercent,
        point.yPercent,
        radius,
      );
    });
  }

  function handleAssign(person: { id: string; name: string }) {
    if (!pending) return;
    const { point, radius } = pending;
    setPending(null);
    startTransition(async () => {
      setSavedRadius({ personId: person.id, radius });
      await setPhotoTagPositionAction(
        familyId,
        familySlug,
        mediaId,
        person.id,
        point.xPercent,
        point.yPercent,
        radius,
      );
    });
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onClick={handleTapToPlace}
      onMouseMove={cursorMarker.onMouseMove}
      onMouseLeave={cursorMarker.onMouseLeave}
      // containerType: the spotlight's radius is sized in cq units of
      // this box (see .photo-tag-spotlight in globals.css).
      style={{
        cursor: showCursorMarker ? "none" : undefined,
        containerType: "size",
      }}
    >
      <PhotoTagSpotlight point={spotlit} others={positioned} />
      {cursorMarker.element}

      {positioned.map((person) => (
        <PhotoTagMarker
          key={person.id}
          person={person}
          point={pointOf(person)}
          isHighlighted={taggingMode || highlightedPersonId === person.id}
          taggingMode={taggingMode}
          canTag={canTag}
          familySlug={familySlug}
          onDragStart={(e) => drag.onDragStart(e, person.id)}
          onDragMove={drag.onDragMove}
          onDragEnd={drag.onDragEnd}
          onEditRadius={() =>
            setEditing({
              personId: person.id,
              point: pointOf(person),
              name: personDisplayName(person, locale),
              radius:
                radiusOf(person) ??
                startingRadius(
                  person,
                  positioned.filter((other) => other.id !== person.id),
                  containerRef.current!,
                ),
            })
          }
          onUntag={() => drag.onUntag(person.id)}
          onRemove={() => drag.onRemove(person.id)}
        />
      ))}

      {editing && (
        <PhotoTagRadiusEditor
          containerRef={containerRef}
          point={editing.point}
          onPointChange={(point) => setEditing({ ...editing, point })}
          radius={editing.radius}
          onRadiusChange={(radius) => setEditing({ ...editing, radius })}
          name={editing.name}
          onCommit={commitRadius}
          onCancel={() => setEditing(null)}
        />
      )}

      {pending && (
        <PhotoTagCircle
          containerRef={containerRef}
          point={pending.point}
          onPointChange={(point) => setPending({ ...pending, point })}
          radius={pending.radius}
          onRadiusChange={(radius) => setPending({ ...pending, radius })}
          label={t("tagRadius")}
          onEscape={() => setPending(null)}
        >
          <div className="w-64 rounded-xl bg-popover p-2 whitespace-normal text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <TagPersonCombobox
              familyId={familyId}
              onSelect={handleAssign}
              autoFocus
            />
          </div>
        </PhotoTagCircle>
      )}
    </div>
  );
}

/**
 * One already-placed tag: a draggable point (TagReticle) plus (canTag only) its dropdown
 * menu. Outside tagging mode the dot itself is invisible by default —
 * `isHighlighted` (set by the caller from `taggingMode` or a hover/focus on
 * the person's chip in TaggedPeopleStrip) reveals it, matching Instagram/
 * Google Photos: dots don't clutter the photo, only a highlighted one shows.
 * The hit area (`button`) stays in the DOM either way, so a keyboard/
 * screen-reader user can still reach the marker without the hover-only
 * highlight.
 */
function PhotoTagMarker({
  person,
  point,
  isHighlighted,
  taggingMode,
  canTag,
  familySlug,
  onDragStart,
  onDragMove,
  onDragEnd,
  onEditRadius,
  onUntag,
  onRemove,
}: {
  person: MediaTaggedPerson;
  point: Point;
  isHighlighted: boolean;
  taggingMode: boolean;
  canTag: boolean;
  familySlug: string;
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onEditRadius: () => void;
  onUntag: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const name = personDisplayName(person, locale);

  const marker = (
    <button
      type="button"
      aria-label={name}
      style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }}
      // touch-none while tagging: without it a finger drag was taken over
      // by the browser as a scroll after the first few px (pointercancel),
      // so on phones a marker couldn't be moved at all.
      className={`group absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        canTag && taggingMode ? "touch-none" : ""
      }`}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      <TagReticle shown={isHighlighted} />
      <span className="sr-only">{name}</span>
    </button>
  );

  // The management menu (open profile/untag/remove) is a tagging-mode
  // affordance only — outside it, this hit area exists purely so hover/
  // focus can reveal the dot (isHighlighted above), and a plain-view click
  // should do nothing rather than surprise the viewer with a popover.
  if (!canTag || !taggingMode) {
    return <div title={name}>{marker}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="contents" render={marker} />
      <DropdownMenuContent align="center">
        <DropdownMenuItem
          render={
            <Link href={`/families/${familySlug}/people/${person.slug}`} />
          }
        >
          <ExternalLinkIcon />
          {t("openProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-muted-foreground">
          <MoveIcon />
          {t("dragTag")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditRadius}>
          <CircleDashedIcon />
          {t("editArea")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUntag}>
          <XIcon />
          {t("removePoint")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onRemove}>
          <XIcon />
          {t("untag")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
