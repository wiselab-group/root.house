import Image from "next/image";
import { FRAME_SIZE, PHOTO_SIZE } from "@/components/tree/card-dimensions";

/** The tree's node box (xyflow-adapter.ts NODE_DIMENSIONS). */
export const TREE_NODE_WIDTH = 160;
export const TREE_NODE_HEIGHT = 166;

/**
 * The tree's person card (tree/compact-card-body.tsx) as plain markup:
 * the --branch matte frame with a 1.5px outline round a rounded-square
 * photo (or initials), the serif name and the years below. A copy, not
 * the component itself — that one is typed against XYFlow node data, and
 * @xyflow/react stays inside components/tree (CLAUDE.md § Forbidden).
 * At rest unless `active`.
 */
export function TreeCard({
  name,
  years,
  photo,
  active = false,
}: {
  name: string;
  years: string;
  photo?: string;
  /** On a traced relationship path — the whole frame turns terracotta,
   *  as CompactCardBody's isTraced. */
  active?: boolean;
}) {
  const frame = active ? "var(--primary)" : "var(--branch)";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <div
      className="flex flex-col items-center px-3 pb-3 text-center"
      style={{ width: TREE_NODE_WIDTH, height: TREE_NODE_HEIGHT }}
    >
      <div
        className="relative shrink-0 rounded-4xl border p-1"
        style={{
          backgroundColor: frame,
          borderColor: frame,
          borderWidth: 1.5,
          width: FRAME_SIZE,
          height: FRAME_SIZE,
        }}
      >
        <div className="relative size-full overflow-hidden rounded-3xl bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              sizes={`${PHOTO_SIZE}px`}
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xl font-medium text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
      </div>
      <div className="relative max-w-[calc(100%+1.5rem)] min-w-0 rounded-lg py-2">
        <p className="mb-0.5 line-clamp-2 font-heading text-sm leading-tight font-medium">
          {name}
        </p>
        <p className="text-xs leading-tight text-muted-foreground">{years}</p>
      </div>
    </div>
  );
}
