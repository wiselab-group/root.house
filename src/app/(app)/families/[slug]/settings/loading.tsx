import { Skeleton } from "@/components/ui/skeleton";

/** Matches settings/page.tsx's container + heading + ProfileSection block shape. */
export default function SettingsLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </main>
  );
}
