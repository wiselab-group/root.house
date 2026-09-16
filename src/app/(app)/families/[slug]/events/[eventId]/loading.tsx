import { Skeleton } from "@/components/ui/skeleton";

/** Matches [eventId]/page.tsx's container + badge/heading + participants shape. */
export default function EventDetailsLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <ul className="flex flex-col divide-y divide-border">
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-4 py-3"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
