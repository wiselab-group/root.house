import { Skeleton } from "@/components/ui/skeleton";

/** Matches PhotosPageLayout's container + header + album/photo grid shape — shared by /photos and /photos/[albumId]. */
export default function PhotosLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
