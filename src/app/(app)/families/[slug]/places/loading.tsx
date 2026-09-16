import { Skeleton } from "@/components/ui/skeleton";

/** Matches places/page.tsx's container + heading + PlacesList row shape. */
export default function PlacesLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-5 w-56" />
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="flex items-center gap-4 py-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </li>
        ))}
      </ul>
    </main>
  );
}
