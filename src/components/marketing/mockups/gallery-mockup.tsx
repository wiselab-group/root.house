import { cn } from "@/lib/utils";

/**
 * Static, decorative illustration of a photo gallery grid — warm-toned CSS
 * gradient tiles standing in for photos, not real images. Used on the
 * PRESERVE hero slide.
 */
export function GalleryMockup() {
  const tiles = [
    "from-primary/30 to-secondary",
    "from-secondary to-accent/60",
    "from-accent/50 to-primary/20",
    "from-muted to-secondary/70",
  ];

  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4"
    >
      {tiles.map((gradient, index) => (
        <div
          key={index}
          className={cn("aspect-square rounded-lg bg-gradient-to-br", gradient)}
        />
      ))}
    </div>
  );
}
