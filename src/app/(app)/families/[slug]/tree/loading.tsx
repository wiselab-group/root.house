import { Loader2 } from "lucide-react";

/**
 * Tree canvas has no meaningful skeleton shape (layout-engine output isn't
 * predictable ahead of the fetch) — a centered spinner + message instead,
 * matching error.tsx's centered-card tone for this same route. Height
 * matches TreeCanvas's own full-bleed sizing (see its doc comment: 4.5rem
 * is AppHeader's fixed height, subtracted the same way here).
 */
export default function FamilyTreeLoading() {
  return (
    <main className="flex h-[calc(100svh-4.5rem)] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">Строим дерево…</p>
    </main>
  );
}
