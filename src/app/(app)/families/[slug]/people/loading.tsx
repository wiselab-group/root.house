import { Skeleton } from "@/components/ui/skeleton";

/** Matches people/page.tsx's container + header + PeopleList row shape. */
export default function PeopleLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="flex items-center gap-4 py-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
