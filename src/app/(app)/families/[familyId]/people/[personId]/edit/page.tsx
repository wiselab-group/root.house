import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { PersonForm } from "@/components/forms/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePersonAction } from "@/actions/person.actions";

export default async function EditPersonPage({
  params,
}: PageProps<"/families/[familyId]/people/[personId]/edit">) {
  const { familyId, personId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  await requireFamilyAccess(familyId, session.user.id, "editor");
  const person = await getPerson(personId, familyId);
  if (!person) notFound();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
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
            submitLabel="Сохранить"
            submitPendingLabel="Сохраняем…"
          />
        </CardContent>
      </Card>
    </main>
  );
}
