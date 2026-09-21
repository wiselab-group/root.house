import { cn } from "@/lib/utils";

/**
 * Static, decorative illustration of the family tree — reuses only the
 * tree's own visual language (sage card identity, terracotta focus, warm
 * brown connector lines), never the real `@xyflow/react` canvas, which is
 * forbidden to import outside src/components/tree/ (CLAUDE.md FORBIDDEN)
 * and far too heavy/stateful for a marketing page. Fictional names/dates
 * only — this is illustration, not product data.
 */
export function TreeMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-10"
    >
      <MockCard name="Eleanor & Frank" years="b. 1938" />
      <Connector />
      <div className="flex items-start gap-10">
        <div className="flex flex-col items-center gap-3">
          <MockCard name="Margaret" years="b. 1961" />
          <Connector short />
          <MockCard name="Owen" years="b. 1989" focus />
        </div>
        <div className="flex flex-col items-center gap-3 pt-14">
          <MockCard name="David" years="b. 1964" />
        </div>
      </div>
    </div>
  );
}

function MockCard({
  name,
  years,
  focus = false,
}: {
  name: string;
  years: string;
  focus?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-36 flex-col gap-0.5 rounded-lg border-2 bg-card px-3 py-2 shadow-sm",
        focus ? "border-primary" : "border-tree-accent",
      )}
    >
      <span className="truncate text-sm font-medium text-foreground">
        {name}
      </span>
      <span className="text-xs text-muted-foreground">{years}</span>
    </div>
  );
}

function Connector({ short = false }: { short?: boolean }) {
  return <div className={cn("w-px bg-branch", short ? "h-4" : "h-6")} />;
}
