import { Skeleton } from "@/components/ui/skeleton";

/** Matches families/page.tsx's container + heading + family-row list shape. */
export default function FamiliesLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-6 py-6"
          >
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="size-5 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
