import { cn } from "@/lib/utils";

/**
 * Landing-only replica of the tree's person card (tree/compact-card-body.tsx)
 * — the same matte frame in --branch at rest and --primary when it's "the
 * one you're looking at", initials instead of a photo, serif name and years
 * below. A replica, not the real component: the real one is typed against
 * XYFlow node data, and @xyflow/react must not be imported outside
 * src/components/tree/ (CLAUDE.md § Forbidden). Sized by its container's
 * width, so the same card works in every landing illustration.
 */
export function MiniPersonCard({
  name,
  years,
  active = false,
  className,
}: {
  name: string;
  years?: string;
  active?: boolean;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className={cn("flex w-full flex-col items-center text-center", className)}
    >
      <div
        className={cn(
          "aspect-square w-[76%] rounded-[28%] border-[1.5px] p-[4%] transition-colors duration-slow ease-(--ease-reveal)",
          active ? "border-primary bg-primary" : "border-branch bg-branch",
        )}
      >
        <div className="flex size-full items-center justify-center rounded-[24%] bg-muted font-medium text-muted-foreground text-[clamp(0.625rem,0.3rem+1.2cqw,1.125rem)]">
          {initials}
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 font-heading text-[clamp(0.625rem,0.45rem+0.75cqw,0.875rem)] leading-tight font-medium text-foreground">
        {name}
      </p>
      {years && (
        <p className="text-[clamp(0.5625rem,0.4rem+0.6cqw,0.75rem)] leading-tight text-muted-foreground">
          {years}
        </p>
      )}
    </div>
  );
}
