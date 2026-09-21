/**
 * Static, decorative illustration of a person profile — a warm-toned
 * placeholder photo, name, timeline stub, and a short story excerpt.
 * Illustrates "a person is more than a name and two dates" without
 * claiming to be a real screenshot. Fictional content only.
 */
export function ProfileMockup() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-4">
        <div className="size-16 shrink-0 rounded-full bg-gradient-to-br from-primary/25 to-secondary" />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-lg font-medium text-foreground">
            Margaret Whitfield
          </span>
          <span className="text-sm text-muted-foreground">1961 — present</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <TimelineRow label="1961" text="Born in Portland" />
        <TimelineRow label="1984" text="Married David" />
        <TimelineRow label="1989" text="Owen was born" />
      </div>

      <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-xs font-medium text-muted-foreground">STORY</p>
        <p className="mt-1 text-sm text-foreground/80">
          &ldquo;She kept every letter my grandfather sent her while he was
          away...&rdquo;
        </p>
      </div>
    </div>
  );
}

function TimelineRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-10 shrink-0 font-medium text-primary">{label}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
