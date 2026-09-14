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
 * Quiet outline at rest (no fill), a muted tint added only on hover — a
 * permanent bg-muted read as heavier than this repeats-per-relationship
 * element should carry, but a bare invisible pill with nothing to trace its
 * shape looked under-defined once the fill was dropped, so the original
 * outline border stays. The whole pill is the
 * click target, not just the name text: `Link` is stretched to cover the
 * full `<li>` via absolute inset-0 (a `<button>` — the heart/× controls —
 * can't nest inside an `<a>`, so they stay as siblings positioned above it
 * with `relative z-10`, the standard "clickable card + escape-hatch button"
 * pattern) — before this, hovering highlighted the whole pill but only the
 * name text itself was actually clickable, a mismatch between the visible
 * hover affordance and the real hit area (caught in live review). Opens in
 * the same tab, matching every other person-link in the app (profile list,
 * search, breadcrumbs) — a relative pill is not a special case.
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
  return (
    <li className="group/pill relative flex max-w-full items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1.5 transition-colors hover:bg-muted/60">
      <Link
        href={`/families/${familySlug}/people/${person.slug}`}
        className="absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={personDisplayName(person)}
      />
      <PersonAvatar
        person={person}
        familyId={familyId}
        size="sm"
        className="pointer-events-none"
      />
      <span className="truncate text-sm font-medium group-hover/pill:text-primary">
        {personDisplayName(person)}
      </span>
      {!person.isCurrent && relationshipKind === "partnership" && (
        <span className="pointer-events-none shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] leading-none font-medium text-muted-foreground">
          бывш.
        </span>
      )}
      {canEdit &&
        relationshipKind === "partnership" &&
        person.relationshipId && (
          <span className="relative z-10">
            <PartnershipStatusToggle
              familyId={familyId}
              personId={personId}
              otherPersonId={person.id}
              relationshipId={person.relationshipId}
              isCurrent={person.isCurrent ?? true}
              relativeName={personDisplayName(person)}
            />
          </span>
        )}
      {canEdit && relationshipKind && person.relationshipId && (
        <span className="relative z-10">
          <RemoveRelationshipButton
            familyId={familyId}
            personId={personId}
            relationshipId={person.relationshipId}
            relationshipKind={relationshipKind}
            relativeName={personDisplayName(person)}
          />
        </span>
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
