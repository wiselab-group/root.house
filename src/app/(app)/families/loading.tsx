import { Skeleton } from "@/components/ui/skeleton";

/** Matches families/page.tsx's dark container + heading + family-card list
 *  shape, on the same dark background so loading doesn't flash light. Every
 *  placeholder is one Skeleton tone (no separate divider lines — 2026-09-19
 *  user request: one consistent tone while loading). */
export default function FamiliesLoading() {
  return (
    <main className="dark photo-backdrop min-h-svh">
      <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 pt-14 pb-20 sm:px-8 sm:pt-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-72" />
            <Skeleton className="h-6 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>

        <ul className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-[86px] w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
