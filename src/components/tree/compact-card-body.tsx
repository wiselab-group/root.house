import { ArchiveImage } from "@/components/media/archive-image";
import { cn } from "@/lib/utils";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { PHOTO_FRAME_PADDING, PHOTO_SIZE } from "./card-dimensions";

/** Photo-forward, name-below tree card: a rounded-square photo sitting
 *  inside a thick "matte" frame (matching the card's own background color
 *  at rest, switching to an identity/status color — see below) flush
 *  against the card's own top edge (no separate card border/background —
 *  see person-node.tsx's outer frame, which skips border/bg for this style
 *  so the parent_child connector line visibly touches the frame) with a
 *  separate white name/years pill floating UP onto the photo's bottom edge
 *  — matching a reference "family archive" screenshot's look exactly
 *  (2026-09-18 v2: the first pass used a thin ring flush against the photo
 *  with a plain gap before the name pill below it — the user flagged that
 *  as visibly different from the reference on a zoomed-in crop: the
 *  reference's frame is a THICK matte in the card's own background tone,
 *  not a thin colored ring, and its name pill overlaps UP onto the photo
 *  rather than sitting in a separate gap below it, wider than the photo
 *  itself). The only card style — a full-width square-photo "portrait"
 *  alternative was removed on user request. Not built on shadcn's Avatar
 *  component (avatar.tsx) — that component hardcodes rounded-full on every
 *  part (root/image/fallback), which can't express this style's
 *  rounded-square photo — so this draws the photo itself via next/image. */
export function CompactCardBody({
  data,
  name,
  years,
  initials,
  isOpen,
  isTraced,
  isSelected,
}: {
  data: PersonFlowNode["data"];
  name: string;
  years: string | null;
  initials: string;
  /** This card's own click-popover is open — terracotta frame (see the frame colors below). */
  isOpen: boolean;
  /** On the currently traced relationship path — terracotta frame, like the traced line itself. */
  isTraced: boolean;
  /** Keyboard-selected — terracotta frame, same color as isTraced (see buildCardFrameClassName's own comment on that split). */
  isSelected: boolean;
}) {
  // At rest the whole frame — the matte around the photo AND its outline —
  // is --branch, the exact tone of the tree's connector lines
  // (relationship-edge.tsx/union-child-edge.tsx), so card and lines read as
  // one drawing (per direct user request, 2026-09-25: the dark
  // --background matte between outline and photo read as a separate black
  // ring; it used to be "cut out of the canvas" per the 2026-09-18
  // reference).
  //
  // Once the card is "the one you're looking at" — its popover is open
  // (isOpen), it's on the traced relationship path (isTraced), or it's
  // keyboard-selected (isSelected) — the WHOLE frame, fill and outline,
  // turns terracotta (--primary): the project's single "what you're looking
  // at / what you picked" color (CLAUDE.md § Design tokens), the same one
  // the traced line itself is drawn in. 2026-09-25, per user request
  // ("активное состояние — или зелёным, или терракотовым"): the active
  // state used to be --branch too, i.e. the same color as a card at rest,
  // and barely readable. One tone for fill and outline, not two — an
  // earlier lighter-terracotta fill inside a differently colored outline was
  // rejected (2026-09-19). The focus person (isFocus) is deliberately NOT an
  // active state — per an earlier direct user request its card stays plain
  // (the layout centering it is signal enough). --tree-card-ring
  // (globals.css) is kept defined but unused here — its value has
  // flip-flopped several times, don't delete it assuming this is final.
  const isActive = isOpen || isTraced || isSelected;
  const frameColor = isActive ? "var(--primary)" : "var(--branch)";
  const frameBorderColor = isActive ? "var(--primary)" : "var(--branch)";

  return (
    <div className="flex flex-col items-center px-3 pb-3 text-center">
      <div
        className={cn(
          // The thick matte frame — a rounded square noticeably larger than
          // the photo it holds (PHOTO_FRAME_PADDING on every side), colored
          // per frameColor above. shrink-0 so a long truncated name in the
          // pill below never squeezes this. A real `border` (not just a
          // background fill) — the frame was once filled with --background
          // at rest, and a bg-only frame was then invisible against the
          // canvas (real bug the user caught). The fill is --branch now, but
          // the border stays so the frame's SHAPE is drawn the same way in
          // every state. Width is set
          // inline (borderWidth, not a Tailwind border-* class) to match the
          // connector lines' own 1.5px strokeWidth exactly (relationship-
          // edge.tsx/union-child-edge.tsx) — no built-in Tailwind utility
          // lands on a non-integer px value, per direct user request that the
          // frame border read as the same thickness as the tree's lines.
          "relative shrink-0 rounded-4xl border p-1 transition-colors duration-200",
        )}
        style={{
          backgroundColor: frameColor,
          borderColor: frameBorderColor,
          borderWidth: 1.5,
          width: PHOTO_SIZE + PHOTO_FRAME_PADDING * 2,
          height: PHOTO_SIZE + PHOTO_FRAME_PADDING * 2,
        }}
      >
        <div
          className={cn(
            "relative size-full overflow-hidden rounded-3xl bg-muted",
            data.isPlaceholder && "outline-dashed outline-muted-foreground",
          )}
        >
          {data.photoUrl ? (
            <ArchiveImage
              src={data.photoUrl}
              alt=""
              fill
              sizes={`${PHOTO_SIZE}px`}
              className="object-cover"
              loading={Math.abs(data.generation) <= 1 ? "eager" : "lazy"}
            />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center text-xl font-medium text-muted-foreground",
                data.isPlaceholder && "italic",
              )}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          // Name/years block, wider than the photo/frame. mt-0 (no overlap) —
          // every negative margin tried (-mt-4, then -mt-2, then -mt-1) kept
          // crowding the text under the photo frame above it (real bug the
          // user caught repeatedly: the name kept reading as cramped/cut
          // off), so the frame and text now sit flush against each other
          // instead of overlapping. No bg/shadow/horizontal padding
          // (2026-09-19, removed per direct user request) — plain text
          // directly on the canvas, only vertical breathing room (py-2)
          // kept; the reference screenshot's floating white card look may
          // come back later, don't reintroduce bg-card/shadow-md/px-3
          // without a new explicit request.
          "relative min-w-0 max-w-[calc(100%+1.5rem)] rounded-lg py-2",
        )}
      >
        <p
          title={name}
          className={cn(
            // font-heading (Lora) — per the reference screenshot, whose
            // name text reads as a serif headline, not the app's usual
            // Geist Sans UI font (2026-09-18). Wraps onto a second line
            // instead of truncating with an ellipsis (2026-09-19, per direct
            // user request) — line-clamp-2 caps it there so a very long name
            // still can't grow the card unbounded. leading-tight (not the
            // default ~1.5) keeps two wrapped lines reading as one compact
            // headline instead of loosely spaced text; mb-0.5 gives the
            // years line below a small deliberate gap rather than the two
            // sitting flush (both tuned together for a "premium" tight-but-
            // legible feel, not derived from any specific reference pixel
            // value).
            "line-clamp-2 font-heading text-sm leading-tight font-medium",
            years && "mb-0.5",
            data.isPlaceholder && "italic text-muted-foreground",
          )}
        >
          {name}
        </p>
        {years && (
          <p className="text-xs leading-tight text-muted-foreground">{years}</p>
        )}
      </div>
    </div>
  );
}
