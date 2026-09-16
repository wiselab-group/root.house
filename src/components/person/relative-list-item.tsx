import Link from "next/link";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonAvatar } from "./person-avatar";
import { RemoveRelationshipButton } from "@/components/forms/remove-relationship-button";
import { PartnershipStatusToggle } from "@/components/forms/partnership-status-toggle";
import type { RelativeItem } from "./relative-item";

/**
 * One relative "pill" — split out of RelativeGroup purely to keep both under
 * CLAUDE.md's 150-line component limit (useOptimistic's addition pushed the
 * combined file over). No shared state beyond its own props.
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
export function RelativeListItem({
  familyId,
  familySlug,
  personId,
  person,
  relationshipKind,
  canEdit,
  onRemove,
  onToggleStatus,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  person: RelativeItem;
  relationshipKind?: "parent_child" | "partnership";
  canEdit: boolean;
  onRemove: () => void;
  onToggleStatus: (isCurrent: boolean) => void;
}) {
  // Trailing icon buttons already carry their own visual weight (rounded
  // hit-area, hover fill) that reads as padding before the pill's own
  // right edge — an extra pr-3 there over-spaced them from the border. A
  // pill with no icons (derived siblings, view-only callers) has nothing
  // after the name/badge to play that role, so it needs the explicit pr-3
  // itself or the text sits flush against the rounded edge.
  const hasIcons = canEdit && relationshipKind && person.relationshipId;
  return (
    <li
      className={`group/pill relative flex max-w-full items-center gap-2 rounded-full border border-border p-1 transition-colors hover:bg-muted/60 ${
        hasIcons ? "" : "pr-3"
      }`}
    >
      <Link
        href={`/families/${familySlug}/people/${person.slug}`}
        className="absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={personDisplayName(person)}
      />
      <PersonAvatar
        person={person}
        familyId={familyId}
        size="sm"
        className="pointer-events-none size-9!"
      />
      <span className="truncate text-sm font-medium group-hover/pill:text-primary">
        {personDisplayName(person)}
      </span>
      {!person.isCurrent && relationshipKind === "partnership" && (
        <span className="pointer-events-none shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] leading-none font-medium text-muted-foreground">
          бывш.
        </span>
      )}
      {canEdit && relationshipKind && person.relationshipId && (
        // -space-x-1: the icon buttons should sit closer to each other than
        // to the name/badge before them — the shared gap-2 on the <li>
        // spread every child equally, so this pair read as spaced apart
        // from itself rather than one grouped "manage this relationship"
        // control cluster.
        <span className="relative z-10 flex items-center -space-x-1">
          {relationshipKind === "partnership" && (
            <PartnershipStatusToggle
              familyId={familyId}
              personId={personId}
              otherPersonId={person.id}
              relationshipId={person.relationshipId}
              isCurrent={person.isCurrent ?? true}
              relativeName={personDisplayName(person)}
              onToggled={onToggleStatus}
            />
          )}
          <RemoveRelationshipButton
            familyId={familyId}
            personId={personId}
            relationshipId={person.relationshipId}
            relationshipKind={relationshipKind}
            relativeName={personDisplayName(person)}
            onRemoved={onRemove}
          />
        </span>
      )}
    </li>
  );
}
