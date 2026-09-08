import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { generationColor } from "./person-node";

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
  /** Focus person or on the currently traced relationship path — person-node.tsx's usual border-primary treatment, moved to a ring around the avatar since this style has no card border of its own. */
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
        // Generation color-coding (DESIGN.md): one warm hue, lightness/
        // chroma fading with distance from focus — never a rainbow per
        // generation. Drawn as a ring around the avatar (box-shadow, so it
        // draws outside the element's own box without shifting layout)
        // rather than a strip above it (as in portrait-card-body.tsx) — a
        // strip here would sit between the connector line and the avatar,
        // breaking the "line touches the avatar" contact this card style
        // is built around. isHighlighted/isSelected override this with the
        // same accent colors person-node.tsx's card border/ring would show
        // in portrait mode — those states outrank plain generation coloring.
        style={{
          boxShadow: isHighlighted
            ? "0 0 0 3px var(--primary), 0 0 0 6px color-mix(in oklch, var(--primary) 30%, transparent)"
            : isSelected
              ? "0 0 0 3px var(--ring)"
              : `0 0 0 3px ${generationColor(data.generation)}`,
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
