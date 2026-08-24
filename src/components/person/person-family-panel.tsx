import Link from "next/link";
import { getFamilyOf } from "@/domain/relationship/relationship.service";
import { listPeople } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddRelativeForm } from "@/components/forms/add-relative-form";
import { RemoveRelationshipButton } from "@/components/forms/remove-relationship-button";
import { CollapsibleForm } from "@/components/forms/collapsible-form";

interface RelativeItem {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  /** The relationship row's own id, for removal. Undefined for derived relations (siblings). */
  relationshipId?: string;
}

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

  const toItem = (relatedPersonId: string, relationshipId: string): RelativeItem | null => {
    const person = peopleById.get(relatedPersonId);
    if (!person) return null;
    return { ...person, relationshipId };
  };

  const parents = family.parents.map((r) => toItem(r.parentId, r.id)).filter((p) => p != null);
  const children = family.children.map((r) => toItem(r.childId, r.id)).filter((p) => p != null);
  const spouses = family.partnerships
    .map((r) => toItem(r.person1Id === personId ? r.person2Id : r.person1Id, r.id))
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
      <CardContent className="flex flex-col gap-6">
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

function RelativeGroup({
  familyId,
  familySlug,
  personId,
  title,
  people,
  relationshipKind,
  canEdit = false,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  title: string;
  people: RelativeItem[];
  relationshipKind?: "parent_child" | "partnership";
  canEdit?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-1 rounded-full border border-border pl-3 pr-1 py-1">
              <Link
                href={`/families/${familySlug}/people/${person.slug}`}
                className="text-sm hover:underline"
              >
                {personDisplayName(person)}
              </Link>
              {canEdit && relationshipKind && person.relationshipId && (
                <RemoveRelationshipButton
                  familyId={familyId}
                  personId={personId}
                  relationshipId={person.relationshipId}
                  relationshipKind={relationshipKind}
                  relativeName={personDisplayName(person)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
