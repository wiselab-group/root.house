import { Skeleton } from "@/components/ui/skeleton";

/** Matches [personSlug]/page.tsx's container + profile header + section shape. */
export default function PersonProfileLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ))}
    </main>
  );
}
