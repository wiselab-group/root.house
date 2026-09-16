import { Skeleton } from "@/components/ui/skeleton";

/** Matches edit/page.tsx's container + avatar/heading + form shape. */
export default function EditPersonLoading() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-48" />
      </div>

      <div className="flex flex-col gap-6 border-t border-border pt-8">
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
