import Link from "next/link";
import { getFamilyOf } from "@/domain/relationship/relationship.service";
import { listPeople } from "@/domain/person/person.service";
import {
  shortLifeSpan,
  type RelationKind,
} from "@/domain/person/relation-label";
import type { PersonRecord } from "@/domain/person/person.repository";
import { AddRelativePanel } from "@/components/forms/add-relative-panel";
import { ProfileSection } from "./profile-section";
import { RelativeGroup } from "./relative-group";
import type { RelativeItem } from "./relative-item";

/**
 * A Person's relatives as ONE plain list — avatar / name / «кем приходится ·
 * годы» — plus a «Добавить родственника» tile at its end. Replaced both the
 * earlier per-kind groups (Родители / Супруги / Дети / Братья и сёстры) and
 * a mini family-tree diagram tried in the redesign mocks: the user asked for
 * a simple list here, the tree itself is one click away. Ordered parents →
 * spouses → children → siblings, so the list still reads generationally.
 *
 * Server component: fetches everything it needs itself so the Person
 * Profile page doesn't have to orchestrate it.
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
    kind: RelationKind,
    relationship?: {
      id: string;
      kind: "parent_child" | "partnership";
      isCurrent?: boolean;
      startDate?: RelativeItem["startDate"];
    },
  ): RelativeItem | null => {
    const person: PersonRecord | undefined = peopleById.get(relatedPersonId);
    if (!person) return null;
    return {
      id: person.id,
      slug: person.slug,
      firstName: person.firstName,
      lastName: person.lastName,
      nickname: person.nickname,
      isPlaceholder: person.isPlaceholder,
      photoMediaId: person.photoMediaId,
      relationKind: kind,
      gender: person.gender,
      lifeSpan: shortLifeSpan(person),
      relationshipKind: relationship?.kind,
      relationshipId: relationship?.id,
      isCurrent: relationship?.isCurrent,
      startDate: relationship?.startDate,
    };
  };

  const relatives = [
    ...family.parents.map((r) =>
      toItem(r.parentId, "parent", { id: r.id, kind: "parent_child" }),
    ),
    ...family.partnerships.map((r) =>
      toItem(r.person1Id === personId ? r.person2Id : r.person1Id, "spouse", {
        id: r.id,
        kind: "partnership",
        isCurrent: r.isCurrent,
        startDate: r.startDate,
      }),
    ),
    ...family.children.map((r) =>
      toItem(r.childId, "child", { id: r.id, kind: "parent_child" }),
    ),
    // Siblings are derived (shared parents), not a stored row — not removable.
    ...family.siblings.map((s) => toItem(s.personId, "sibling")),
  ].filter((item): item is RelativeItem => item !== null);

  return (
    <ProfileSection
      id="family"
      title="Семья"
      className="min-w-0 scroll-mt-24"
      action={
        <Link
          href={`/families/${familySlug}/tree?focus=${personId}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Открыть в дереве →
        </Link>
      }
    >
      <div className="flex min-w-0 flex-col gap-2">
        {relatives.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Родственники пока не указаны. Добавленные люди появятся здесь и в
            семейном дереве.
          </p>
        )}
        <RelativeGroup
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          people={relatives}
          canEdit={canEdit}
        />
        {canEdit && (
          <AddRelativePanel
            familyId={familyId}
            personId={personId}
            candidates={otherPeople}
          />
        )}
      </div>
    </ProfileSection>
  );
}
