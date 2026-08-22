import { PersonForm } from "@/components/forms/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPersonAction } from "@/actions/person.actions";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export default async function NewPersonPage({ params }: PageProps<"/families/[slug]/people/new">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
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
            submitLabel="Добавить"
            submitPendingLabel="Добавляем…"
          />
        </CardContent>
      </Card>
    </main>
  );
}
