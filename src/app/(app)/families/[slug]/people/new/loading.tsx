import { Skeleton } from "@/components/ui/skeleton";

/** Matches new/page.tsx's container + heading + form shape. */
export default function NewPersonLoading() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
