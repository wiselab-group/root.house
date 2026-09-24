import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { personDisplayName } from "@/domain/person/display-name";
import { relationLabel } from "@/domain/person/relation-label";
import { PersonThumb } from "./person-thumb";
import { RemoveRelationshipButton } from "@/components/forms/remove-relationship-button";
import { PartnershipStatusToggle } from "@/components/forms/partnership-status-toggle";
import { PartnershipDateEditButton } from "@/components/forms/partnership-date-edit-button";
import type { RelativeItem } from "./relative-item";

/**
 * One row of the Person Profile's family list: avatar (sage ring — the
 * tree's "this is a person" identity color, see CLAUDE.md DESIGN TOKENS),
 * name, and «кем приходится · годы» underneath.
 *
 * The whole row is the click target: `Link` is stretched over the `<li>`
 * via absolute inset-0, and the relationship controls (date / status /
 * remove — editors only) sit above it with `relative z-10`, since a
 * `<button>` can't nest inside an `<a>` (the standard "clickable card +
 * escape-hatch buttons" pattern this row inherited from the old pill). On
 * pointer devices the controls stay hidden until the row is hovered or
 * focused, so at rest every row reads like the mock — avatar, name,
 * relation, chevron; on touch screens they're always visible.
 */
export function RelativeListItem({
  familyId,
  familySlug,
  personId,
  person,
  canEdit,
  onRemove,
  onToggleStatus,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  person: RelativeItem;
  canEdit: boolean;
  onRemove: () => void;
  onToggleStatus: (isCurrent: boolean) => void;
}) {
  const name = personDisplayName(person);
  const kind = canEdit ? person.relationshipKind : undefined;
  const relationshipId = kind ? person.relationshipId : undefined;
  const subline = [
    relationLabel(person.relationKind, person.gender, person.isCurrent ?? true),
    person.lifeSpan,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group/row relative flex min-w-0 items-center gap-3.5 rounded-2xl p-2.5 transition-colors duration-200 ease-(--ease-reveal) hover:bg-glass-strong">
      <Link
        href={`/families/${familySlug}/people/${person.slug}`}
        className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`${name}, ${subline}`}
      />
      <span className="pointer-events-none">
        <PersonThumb person={person} familyId={familyId} />
      </span>
      <span className="pointer-events-none flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[0.95rem] font-medium">{name}</span>
        <span className="truncate text-sm text-muted-foreground tabular-nums">
          {subline}
        </span>
      </span>
      {kind && relationshipId && (
        <span className="relative z-10 flex items-center -space-x-1 transition-opacity duration-200 ease-(--ease-reveal) [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
          {kind === "partnership" && (
            <>
              <PartnershipDateEditButton
                familyId={familyId}
                personId={personId}
                otherPersonId={person.id}
                relationshipId={relationshipId}
                startDate={person.startDate}
                relativeName={name}
              />
              <PartnershipStatusToggle
                familyId={familyId}
                personId={personId}
                otherPersonId={person.id}
                relationshipId={relationshipId}
                isCurrent={person.isCurrent ?? true}
                relativeName={name}
                onToggled={onToggleStatus}
              />
            </>
          )}
          <RemoveRelationshipButton
            familyId={familyId}
            personId={personId}
            relationshipId={relationshipId}
            relationshipKind={kind}
            relativeName={name}
            onRemoved={onRemove}
          />
        </span>
      )}
      <ChevronRightIcon
        className="pointer-events-none size-4 shrink-0 text-foreground/35 transition-transform duration-200 ease-(--ease-reveal) group-hover/row:translate-x-0.5 group-hover/row:text-foreground"
        aria-hidden="true"
      />
    </li>
  );
}
