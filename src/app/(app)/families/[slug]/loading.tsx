import { Skeleton } from "@/components/ui/skeleton";

/** Matches [slug]/page.tsx's container + heading + tree-launch card + nav-card grid shape. */
export default function FamilyDashboardLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
