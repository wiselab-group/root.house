import { Skeleton } from "@/components/ui/skeleton";

/** Matches [slug]/page.tsx's dark container + title/counts header + tree
 *  card + nav-card grid shape — on the same dark background, so loading
 *  doesn't flash light. */
export default function FamilyDashboardLoading() {
  return (
    <main className="dark photo-backdrop min-h-svh">
      <div className="mx-auto flex max-w-3xl flex-col gap-14 px-4 pt-14 pb-20 sm:px-8 sm:pt-20">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-14 w-56" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
