import { PersonForm } from "@/components/forms/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPersonAction, type PersonFormState } from "@/actions/person.actions";

export default async function NewPersonPage({ params }: PageProps<"/families/[familyId]/people/new">) {
  const { familyId } = await params;
  const boundAction = (state: PersonFormState, formData: FormData) =>
    createPersonAction(familyId, state, formData);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Добавить человека</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonForm action={boundAction} submitLabel="Добавить" submitPendingLabel="Добавляем…" />
        </CardContent>
      </Card>
    </main>
  );
}
