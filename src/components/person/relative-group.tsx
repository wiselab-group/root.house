import Link from "next/link";
import { personDisplayName } from "@/domain/person/display-name";
import { RemoveRelationshipButton } from "@/components/forms/remove-relationship-button";
import { PartnershipStatusToggle } from "@/components/forms/partnership-status-toggle";
import type { RelativeItem } from "./relative-item";

/**
 * One relative "pill" — split out of RelativeGroup purely to keep both under
 * CLAUDE.md's 150-line component limit (PartnershipStatusToggle's addition
 * pushed the combined file over). No shared state beyond its own props.
 */
function RelativeListItem({
  familyId,
  familySlug,
  personId,
  person,
  relationshipKind,
  canEdit,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  person: RelativeItem;
  relationshipKind?: "parent_child" | "partnership";
  canEdit: boolean;
}) {
  const canManage = canEdit && relationshipKind && person.relationshipId;
  return (
    <li
      className={`flex max-w-full items-center gap-1 rounded-full border border-border py-1 pl-3 ${
        canManage ? "pr-1" : "pr-3"
      }`}
    >
      <Link
        href={`/families/${familySlug}/people/${person.slug}`}
        className="truncate text-sm hover:underline"
      >
        {personDisplayName(person)}
      </Link>
      {!person.isCurrent && relationshipKind === "partnership" && (
        <span className="ml-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] leading-none font-medium text-muted-foreground">
          бывш.
        </span>
      )}
      {canEdit &&
        relationshipKind === "partnership" &&
        person.relationshipId && (
          <PartnershipStatusToggle
            familyId={familyId}
            personId={personId}
            otherPersonId={person.id}
            relationshipId={person.relationshipId}
            isCurrent={person.isCurrent ?? true}
            relativeName={personDisplayName(person)}
          />
        )}
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
  );
}

export function RelativeGroup({
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
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {people.map((person) => (
            <RelativeListItem
              key={person.id}
              familyId={familyId}
              familySlug={familySlug}
              personId={personId}
              person={person}
              relationshipKind={relationshipKind}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
