import Link from "next/link";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonAvatar } from "./person-avatar";
import { RemoveRelationshipButton } from "@/components/forms/remove-relationship-button";
import { PartnershipStatusToggle } from "@/components/forms/partnership-status-toggle";
import type { RelativeItem } from "./relative-item";

/**
 * One relative "pill" — split out of RelativeGroup purely to keep both under
 * CLAUDE.md's 150-line component limit (PartnershipStatusToggle's addition
 * pushed the combined file over). No shared state beyond its own props.
 *
 * Carries a small PersonAvatar and denser weight (bg-muted/50 fill, medium
 * text) rather than a bare outline ring around plain text — this is the
 * profile's most-repeated interactive element (every relationship on the
 * page renders through here) and a thin gray outline with tiny type read as
 * a generic admin-tool chip, not "a family member" (impeccable design pass,
 * `bolder`: avatars + denser pill, per explicit user choice over a
 * text-only amplification).
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
      className={`group/pill flex max-w-full items-center gap-2 rounded-full bg-muted/60 py-1 pr-3 pl-1.5 transition-colors hover:bg-muted ${
        canManage ? "pr-1.5" : "pr-3"
      }`}
    >
      <PersonAvatar person={person} familyId={familyId} size="sm" />
      <Link
        href={`/families/${familySlug}/people/${person.slug}`}
        className="truncate text-sm font-medium group-hover/pill:text-primary group-hover/pill:underline"
      >
        {personDisplayName(person)}
      </Link>
      {!person.isCurrent && relationshipKind === "partnership" && (
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[0.65rem] leading-none font-medium text-muted-foreground">
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
