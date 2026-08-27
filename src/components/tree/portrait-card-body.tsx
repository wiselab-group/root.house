import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { generationColor } from "./person-node";

/** Photo-forward tree card: a large portrait photo (or an initials tile when none is set) with name/years below — for browsing faces rather than scanning structure. */
export function PortraitCardBody({
  data,
  name,
  years,
  initials,
}: {
  data: PersonFlowNode["data"];
  name: string;
  years: string | null;
  initials: string;
}) {
  return (
    <>
      <div className="relative aspect-square w-full bg-muted">
        {data.photoMediaId ? (
          <Image
            src={`/api/media/${data.photoMediaId}?familyId=${data.familyId}`}
            alt=""
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
            // Which card is the actual LCP element depends on where the
            // tree's initial 85%-zoom viewport (InitialFocusViewport in
            // tree-canvas.tsx) lands, not just on which single node is
            // isFocus — a same-generation sibling or partner sitting right
            // next to the focus card is just as likely to be the visually
            // largest paint. Eager-loading everyone within one generation of
            // focus (not only the exact focus node) covers that realistic
            // "above the fold at open" set without eager-loading the whole
            // tree. Per Next's own guidance for this exact "multiple images
            // could be the LCP element depending on viewport" case: prefer
            // loading="eager", not the `preload` prop (which assumes a
            // single deterministic LCP element).
            loading={Math.abs(data.generation) <= 1 ? "eager" : "lazy"}
          />
        ) : (
          <div
            className={cn(
              "flex size-full items-center justify-center text-2xl font-medium text-muted-foreground",
              data.isPlaceholder && "italic",
            )}
          >
            {initials}
          </div>
        )}
        {/* Generation color-coding (DESIGN.md): one warm hue, lightness/chroma
            fading with distance from focus — never a rainbow per generation. */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: generationColor(data.generation) }}
        />
      </div>
      <div className="px-2.5 py-2">
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
    </>
  );
}
