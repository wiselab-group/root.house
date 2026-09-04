import { PersonForm } from "@/components/forms/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPersonAction } from "@/actions/person.actions";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { listPlaces } from "@/domain/place/place.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

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
          {/*
            createPersonAction.bind(null, familyId) — NOT a plain closure —
            because binding extra args onto a real "use server" action is the
            one form of "function passed from server to client" React
            allows; an arrow function wrapping it is an ordinary client-side
            function and throws "Functions cannot be passed directly to
            Client Components" at runtime (caught live via a screenshot).
          */}
          <PersonForm
            action={createPersonAction.bind(null, familyId)}
            places={places}
            submitLabel="Добавить"
            submitPendingLabel="Добавляем…"
          />
        </CardContent>
      </Card>
    </main>
  );
}
