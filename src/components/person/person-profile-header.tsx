import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { FamilyRole } from "@/domain/family/roles";
import { LinkButton } from "@/components/ui/link-button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { DeletePersonButton } from "@/components/person/delete-person-button";

/** Avatar + name + birth/death (with place) + edit/delete actions atop a Person's profile. */
export function PersonProfileHeader({
  person,
  personSlug,
  familyId,
  familySlug,
  role,
  birthPlace,
  deathPlace,
}: {
  person: PersonRecord;
  personSlug: string;
  familyId: string;
  familySlug: string;
  role: FamilyRole;
  birthPlace: PlaceRecord | null;
  deathPlace: PlaceRecord | null;
}) {
  const canEdit = role === "owner" || role === "editor";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <PersonAvatar person={person} familyId={familyId} className="size-20! text-xl" />
        <div>
          <h1 className="font-heading text-3xl font-medium">{personDisplayName(person)}</h1>
          <p className="text-muted-foreground">
            {formatPartialDate(person.birthDate)}
            {birthPlace && `, ${birthPlace.name}`}
            {!person.isLiving &&
              ` — ${formatPartialDate(person.deathDate)}${deathPlace ? `, ${deathPlace.name}` : ""}`}
          </p>
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <LinkButton variant="outline" href={`/families/${familySlug}/people/${personSlug}/edit`}>
            Редактировать
          </LinkButton>
          {/* Deletion is restricted to owners — more destructive/
              irreversible than regular editor-level CRUD (cascades to
              relationships, event participation, media links). */}
          {role === "owner" && (
            <DeletePersonButton
              familyId={familyId}
              personId={person.id}
              personName={personDisplayName(person)}
            />
          )}
        </div>
      )}
    </div>
  );
}
