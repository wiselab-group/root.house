import Link from "next/link";
import { getFamilyOf } from "@/domain/relationship/relationship.service";
import { listPeople } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddRelativeForm } from "@/components/forms/add-relative-form";

/**
 * Renders a Person's parents/spouses/children/siblings plus inline
 * "add relative" forms. Server component: fetches everything it needs
 * itself so the Person Profile page doesn't have to orchestrate it.
 */
export async function PersonFamilyPanel({
  familyId,
  personId,
  canEdit,
}: {
  familyId: string;
  personId: string;
  canEdit: boolean;
}) {
  const [family, allPeople] = await Promise.all([
    getFamilyOf(personId, familyId),
    listPeople(familyId),
  ]);

  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const otherPeople = allPeople.filter((p) => p.id !== personId);

  const parents = family.parents.map((r) => peopleById.get(r.parentId)).filter((p) => p != null);
  const children = family.children.map((r) => peopleById.get(r.childId)).filter((p) => p != null);
  const spouses = family.partnerships
    .map((r) => peopleById.get(r.person1Id === personId ? r.person2Id : r.person1Id))
    .filter((p) => p != null);
  const siblings = family.siblings
    .map((s) => peopleById.get(s.personId))
    .filter((p) => p != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Семья</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RelativeGroup familyId={familyId} title="Родители" people={parents} />
        <RelativeGroup familyId={familyId} title="Супруги" people={spouses} />
        <RelativeGroup familyId={familyId} title="Дети" people={children} />
        <RelativeGroup familyId={familyId} title="Братья и сёстры" people={siblings} />

        {canEdit && (
          <div className="grid gap-3 sm:grid-cols-3">
            <AddRelativeForm
              familyId={familyId}
              personId={personId}
              kind="parent"
              candidates={otherPeople}
              label="Добавить родителя"
            />
            <AddRelativeForm
              familyId={familyId}
              personId={personId}
              kind="spouse"
              candidates={otherPeople}
              label="Добавить супруга"
            />
            <AddRelativeForm
              familyId={familyId}
              personId={personId}
              kind="child"
              candidates={otherPeople}
              label="Добавить ребёнка"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelativeGroup({
  familyId,
  title,
  people,
}: {
  familyId: string;
  title: string;
  people: Array<{ id: string; firstName: string | null; lastName: string | null; nickname: string | null; isPlaceholder: boolean }>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/families/${familyId}/people/${person.id}`}
                className="rounded-full border border-border px-3 py-1 text-sm hover:border-foreground/30"
              >
                {personDisplayName(person)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
