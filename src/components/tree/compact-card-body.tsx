import Image from "next/image";
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
 *  itself). See portrait-card-body.tsx for the alternative full-width
 *  square-photo style. Not built on shadcn's Avatar component (avatar.tsx)
 *  — that component hardcodes rounded-full on every part (root/image/
 *  fallback), which can't express this style's rounded-square photo — so
 *  this draws the photo itself via next/image, same approach portrait-
 *  card-body.tsx already uses. */
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
  /** This card's own click-popover is open — terracotta frame here (NOT the usual sage identity color, see this function's own comment on that deliberate exception). */
  isOpen: boolean;
  /** On the currently traced relationship path — terracotta, person-node.tsx's usual border-primary treatment on the portrait style, expressed here as the matte frame's own color since this style has no card border of its own. */
  isTraced: boolean;
  /** Keyboard-selected — terracotta frame, same color as isTraced (see buildCardFrameClassName's own comment on that split). */
  isSelected: boolean;
}) {
  // At rest the matte frame is just the card's own background tone (reads
  // as "cut out of the page", per the reference) — it only becomes a
  // visible color once this card is in one of these three "look at me"
  // states. All three (isOpen, isTraced, isSelected) use the SAME
  // --tree-card-ring terracotta here — a deliberate, explicit exception to
  // the tree's usual sage/terracotta split (buildCardFrameClassName's own
  // doc comment: sage = "who you're looking at right now" / isOpen,
  // terracotta = "what you selected/traced"), scoped to ONLY this compact
  // card style's matte frame, per direct user request (2026-09-18): sage
  // read as visually jarring here against this style's warm terracotta-only
  // palette. Portrait's own card frame (person-node-parts.tsx) keeps the
  // original sage-for-isOpen split untouched. The tree's focus person
  // (isFocus) is deliberately NOT one of these states — per an earlier
  // direct user request, the focus person's card should read as a plain,
  // unhighlighted card, not singled out with a colored frame (the layout
  // centering it is already enough of a "this is the center" signal).
  const frameColor =
    isOpen || isTraced || isSelected
      ? "var(--tree-card-ring)"
      : "var(--background)";
  // The frame's border is ALWAYS --branch — the same color the tree's own
  // connector lines are drawn in (relationship-edge.tsx/union-child-edge.tsx)
  // — regardless of frameColor/state, per direct user request: the border
  // must stay visible as a distinct outline even when the fill switches to
  // --tree-card-ring, not disappear into the fill the way it briefly did
  // when the border color tracked frameColor 1:1.
  const frameBorderColor = "var(--branch)";

  return (
    <div className="flex flex-col items-center px-3 pb-3 text-center">
      <div
        className={cn(
          // The thick matte frame — a rounded square noticeably larger than
          // the photo it holds (PHOTO_FRAME_PADDING on every side), colored
          // per frameColor above. shrink-0 so a long truncated name in the
          // pill below never squeezes this. A real `border` (not just a
          // background fill) — at rest, frameColor equals --background, so
          // a plain bg-only frame was visually indistinguishable from the
          // canvas behind it (real bug the user caught: the frame around a
          // non-focus/non-traced/non-selected card was completely invisible,
          // not just subtle). The border keeps the frame's own SHAPE always
          // visible, whatever color it's currently filled with.
          "relative shrink-0 rounded-4xl border-2 p-1 transition-colors duration-200",
        )}
        style={{
          backgroundColor: frameColor,
          borderColor: frameBorderColor,
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
            <Image
              src={data.photoUrl}
              alt=""
              fill
              sizes={`${PHOTO_SIZE}px`}
              className="object-cover"
              unoptimized
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
          // Floating white name/years pill, per the reference screenshot —
          // wider than the photo/frame. mt-0 (no overlap) — every negative
          // margin tried (-mt-4, then -mt-2, then -mt-1) kept crowding the
          // pill's own text under the photo frame above it (real bug the
          // user caught repeatedly: the name kept reading as cramped/cut
          // off), so the frame and pill now sit flush against each other
          // instead of overlapping.
          "relative min-w-0 max-w-[calc(100%+1.5rem)] rounded-lg bg-card px-3 py-2 shadow-md",
        )}
      >
        <p
          title={name}
          className={cn(
            // font-heading (Lora) — per the reference screenshot, whose
            // name text reads as a serif headline, not the app's usual
            // Geist Sans UI font (2026-09-18).
            "truncate font-heading text-sm font-medium",
            data.isPlaceholder && "italic text-muted-foreground",
          )}
        >
          {name}
        </p>
        {years && <p className="text-xs text-muted-foreground">{years}</p>}
      </div>
    </div>
  );
}
