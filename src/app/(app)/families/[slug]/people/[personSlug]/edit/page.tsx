import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { PersonForm } from "@/components/forms/person-form";
import { AvatarEditor } from "@/components/forms/avatar-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePersonAction } from "@/actions/person.actions";
import { listPlaces } from "@/domain/place/place.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { personDisplayName } from "@/domain/person/display-name";

export default async function EditPersonPage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">) {
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "editor");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getPerson(personId, familyId);
  if (!person) notFound();
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
          {
            label: personDisplayName(person),
            href: `/families/${slug}/people/${personSlug}`,
          },
          { label: "Редактировать" },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Фото профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarEditor
            familyId={familyId}
            personId={personId}
            person={person}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать</CardTitle>
        </CardHeader>
        <CardContent>
          {/* .bind() on the real "use server" action, not a closure — see
              note in people/new/page.tsx for why this distinction matters. */}
          <PersonForm
            action={updatePersonAction.bind(null, familyId, personId)}
            person={person}
            places={places}
            submitLabel="Сохранить"
            submitPendingLabel="Сохраняем…"
          />
        </CardContent>
      </Card>
    </main>
  );
}
