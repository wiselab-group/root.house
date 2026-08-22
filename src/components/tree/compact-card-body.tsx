import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { generationColor } from "./person-node";

/** The original single-row tree card: small avatar beside name+years — dense, good for seeing many generations at once. */
export function CompactCardBody({
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
      {/* Generation color-coding (DESIGN.md): one warm hue, lightness/chroma
          fading with distance from focus — never a rainbow per generation. */}
      <div
        className="h-1"
        style={{ backgroundColor: generationColor(data.generation) }}
      />
      <div className="flex items-center gap-2 px-4 py-3">
        <Avatar size="lg" className="size-11! shrink-0 text-sm">
          {data.photoMediaId && (
            <AvatarImage
              src={`/api/media/${data.photoMediaId}?familyId=${data.familyId}`}
              alt=""
            />
          )}
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
    </>
  );
}
