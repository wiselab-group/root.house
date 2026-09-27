import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  listPeople,
  filterVisiblePersons,
} from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { LinkButton } from "@/components/ui/link-button";
import { PeopleList } from "@/components/person/people-list";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("familyNav");
  return { title: t("people") };
}

export default async function PeoplePage({
  params,
}: PageProps<"/families/[slug]/people">) {
  const tn = await getTranslations("familyNav");
  const t = await getTranslations("people");
  const tCount = await getTranslations("counts");
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const [allPeople, family] = await Promise.all([
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const people = filterVisiblePersons(allPeople, {
    userId: session.user.id,
    role: member.role,
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: tn("people") },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-title font-medium tracking-tight text-balance">
            {tn("people")}
          </h1>
          <p className="text-muted-foreground">
            {people.length > 0
              ? t("inArchive", {
                  people: tCount("people", { count: people.length }),
                })
              : t("empty")}
          </p>
        </div>
        <LinkButton
          href={`/families/${slug}/people/new`}
          className="w-full shrink-0 sm:w-auto"
        >
          {t("add")}
        </LinkButton>
      </div>

      {people.length === 0 ? (
        <EmptyPeopleState familySlug={slug} />
      ) : (
        <PeopleList familyId={familyId} familySlug={slug} people={people} />
      )}
    </main>
  );
}

/** Same teaching-empty-state shape as /families' own — a concrete next
 *  step, not a bare "nothing here" (product.md's own ban). */
function EmptyPeopleState({ familySlug }: { familySlug: string }) {
  const t = useTranslations("people");
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserPlus className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">{t("emptyTitle")}</h2>
        <p className="text-muted-foreground">{t("emptyBody")}</p>
      </div>
      <LinkButton href={`/families/${familySlug}/people/new`}>
        {t("add")}
      </LinkButton>
    </div>
  );
}
