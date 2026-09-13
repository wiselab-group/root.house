import { getFamilyOf } from "@/domain/relationship/relationship.service";
import { listPeople } from "@/domain/person/person.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddRelativeForm } from "@/components/forms/add-relative-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { RelativeGroup } from "./relative-group";
import type { RelativeItem } from "./relative-item";

/**
 * Renders a Person's parents/spouses/children/siblings plus inline
 * "add relative" forms. Server component: fetches everything it needs
 * itself so the Person Profile page doesn't have to orchestrate it.
 */
export async function PersonFamilyPanel({
  familyId,
  familySlug,
  personId,
  canEdit,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  canEdit: boolean;
}) {
  const [family, allPeople] = await Promise.all([
    getFamilyOf(personId, familyId),
    listPeople(familyId),
  ]);

  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const otherPeople = allPeople.filter((p) => p.id !== personId);

  const toItem = (
    relatedPersonId: string,
    relationshipId: string,
    isCurrent?: boolean,
  ): RelativeItem | null => {
    const person = peopleById.get(relatedPersonId);
    if (!person) return null;
    return { ...person, relationshipId, isCurrent };
  };

  const parents = family.parents
    .map((r) => toItem(r.parentId, r.id))
    .filter((p) => p != null);
  const children = family.children
    .map((r) => toItem(r.childId, r.id))
    .filter((p) => p != null);
  const spouses = family.partnerships
    .map((r) =>
      toItem(
        r.person1Id === personId ? r.person2Id : r.person1Id,
        r.id,
        r.isCurrent,
      ),
    )
    .filter((p) => p != null);
  const siblings = family.siblings
    .map((s) => peopleById.get(s.personId))
    .filter((p) => p != null)
    .map((p): RelativeItem => ({ ...p })); // no relationshipId — siblings are derived, not removable

  return (
    <Card>
      <CardHeader>
        <CardTitle>Семья</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-6">
        <RelativeGroup
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          title="Родители"
          people={parents}
          relationshipKind="parent_child"
          canEdit={canEdit}
        />
        <RelativeGroup
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          title="Супруги"
          people={spouses}
          relationshipKind="partnership"
          canEdit={canEdit}
        />
        <RelativeGroup
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          title="Дети"
          people={children}
          relationshipKind="parent_child"
          canEdit={canEdit}
        />
        <RelativeGroup
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          title="Братья и сёстры"
          people={siblings}
        />

        {canEdit && (
          <div className="grid gap-3 sm:grid-cols-3">
            <CollapsibleForm triggerLabel="Добавить родителя">
              <AddRelativeForm
                familyId={familyId}
                personId={personId}
                kind="parent"
                candidates={otherPeople}
                label="Добавить родителя"
              />
            </CollapsibleForm>
            <CollapsibleForm triggerLabel="Добавить супруга">
              <AddRelativeForm
                familyId={familyId}
                personId={personId}
                kind="spouse"
                candidates={otherPeople}
                label="Добавить супруга"
              />
            </CollapsibleForm>
            <CollapsibleForm triggerLabel="Добавить ребёнка">
              <AddRelativeForm
                familyId={familyId}
                personId={personId}
                kind="child"
                candidates={otherPeople}
                label="Добавить ребёнка"
              />
            </CollapsibleForm>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
