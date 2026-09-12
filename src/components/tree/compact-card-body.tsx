import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";

/** Photo-forward, name-below tree card: a large round avatar sitting flush
 *  against the card's own top edge (no border/background of its own — see
 *  person-node.tsx's outer frame, which skips border/bg for this style so
 *  the parent_child connector line visibly touches the avatar) above the
 *  name and years — for a familiar "contact card" feel rather than a dense
 *  data row. See portrait-card-body.tsx for the alternative square-photo,
 *  full-width style. */
export function CompactCardBody({
  data,
  name,
  years,
  initials,
  isHighlighted,
  isSelected,
}: {
  data: PersonFlowNode["data"];
  name: string;
  years: string | null;
  initials: string;
  /** Focus person or on the currently traced relationship path — stays the sage identity color (thicker ring), not terracotta; see buildCardFrameClassName's own comment on that split. */
  isHighlighted: boolean;
  /** Keyboard-selected (person-node.tsx's usual ring-ring treatment). */
  isSelected: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 pb-3 text-center">
      <Avatar
        size="lg"
        className={cn(
          // "!" is required here — Avatar's own data-[size=lg]:size-10
          // variant (avatar.tsx) otherwise wins over a plain size-* utility
          // regardless of source order (see avatar-editor.tsx/people-list.tsx
          // for the same pattern already used elsewhere in this codebase).
          "size-22! text-xl",
          data.isPlaceholder && "outline-dashed outline-muted-foreground",
        )}
        // Identity ring (DESIGN.md): one flat sage (--tree-accent) color for
        // every card, regardless of generation — always visible as this
        // person's own "identity" ring, independent of whatever's currently
        // focused/traced. Drawn as a ring around the avatar (box-shadow, so
        // it draws outside the element's own box without shifting layout)
        // rather than a strip above it (as in portrait-card-body.tsx) — a
        // strip here would sit between the connector line and the avatar,
        // breaking the "line touches the avatar" contact this card style is
        // built around. isHighlighted (focus/traced) stays the same sage
        // (--tree-accent) identity color, just thickened with a second ring
        // for emphasis — terracotta (--primary) is reserved for isSelected
        // (keyboard navigation) only (see buildCardFrameClassName's own
        // comment on that split).
        style={{
          boxShadow: isSelected
            ? "0 0 0 3px var(--ring)"
            : isHighlighted
              ? "0 0 0 3px var(--tree-accent), 0 0 0 6px color-mix(in oklch, var(--tree-accent) 30%, transparent)"
              : "0 0 0 3px var(--tree-accent)",
        }}
      >
        {data.photoUrl && <AvatarImage src={data.photoUrl} alt="" />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p
          title={name}
          className={cn(
            "truncate text-sm font-medium",
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
