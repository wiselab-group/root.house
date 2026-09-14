import type { Metadata } from "next";
import { PersonCreateForm } from "@/components/forms/person-create-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { listPlaces } from "@/domain/place/place.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export const metadata: Metadata = {
  title: "Добавить человека",
};

export default async function NewPersonPage({
  params,
}: PageProps<"/families/[slug]/people/new">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const [places, family] = await Promise.all([
    listPlaces(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Люди", href: `/families/${slug}/people` },
          { label: "Добавить человека" },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Добавить человека</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonCreateForm familyId={familyId} places={places} />
        </CardContent>
      </Card>
    </main>
  );
}
