import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { PersonCreateForm } from "@/components/forms/person-create-form";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { listPlaces } from "@/domain/place/place.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people");
  return { title: t("add") };
}

export default async function NewPersonPage({
  params,
}: PageProps<"/families/[slug]/people/new">) {
  const tn = await getTranslations("familyNav");
  const t = await getTranslations("people");
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const [places, family] = await Promise.all([
    listPlaces(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: tn("people"), href: `/families/${slug}/people` },
          { label: t("add") },
        ]}
      />
      <h1 className="font-heading text-title font-medium tracking-tight text-balance">
        {t("add")}
      </h1>
      <PersonCreateForm familyId={familyId} familySlug={slug} places={places} />
    </main>
  );
}
