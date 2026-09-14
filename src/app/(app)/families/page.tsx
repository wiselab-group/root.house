import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, TreeDeciduous } from "lucide-react";
import { auth } from "@/lib/auth";
import { LinkButton } from "@/components/ui/link-button";
import { listFamiliesForUser } from "@/domain/family/family.service";
import { personCountLabel } from "@/domain/shared/pluralize-ru";

export const metadata: Metadata = {
  title: "Мои семьи",
};

export default async function FamiliesPage() {
  const session = await auth();
  const families = session?.user
    ? await listFamiliesForUser(session.user.id)
    : [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Ваши семьи
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Каждый архив хранит свою родословную, людей и историю отдельно.
          </p>
        </div>
        <LinkButton href="/families/new" className="w-full shrink-0 sm:w-auto">
          Создать семью
        </LinkButton>
      </div>

      {families.length === 0 ? (
        <EmptyFamiliesState />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {families.map((family, index) => (
            <li
              key={family.id}
              className="animate-content-enter"
              style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
            >
              <Link
                href={`/families/${family.slug}`}
                className="group/row flex items-center justify-between gap-6 py-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-heading text-xl font-medium transition-colors group-hover/row:text-primary">
                    {family.name}
                  </span>
                  {family.description ? (
                    <span className="truncate text-sm text-muted-foreground">
                      {family.description}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {personCountLabel(family.personCount)} в архиве
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {family.description && (
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      {personCountLabel(family.personCount)}
                    </span>
                  )}
                  <ArrowRight
                    className="size-5 text-muted-foreground/60 transition-all duration-200 ease-(--ease-tree-focus) group-hover/row:translate-x-1 group-hover/row:text-primary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** Teaching empty state — not "nothing here" (product.md's own ban) but a
 *  concrete next step, framed around what the archive becomes rather than
 *  the CRUD action of creating a row. */
function EmptyFamiliesState() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <TreeDeciduous
          className="size-6"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">Начните с себя</h2>
        <p className="text-muted-foreground">
          Создайте архив, добавьте себя, родителей и близких — дерево выстроится
          само по мере того, как вы будете вспоминать родных.
        </p>
      </div>
      <LinkButton href="/families/new">Создать первую семью</LinkButton>
    </div>
  );
}
