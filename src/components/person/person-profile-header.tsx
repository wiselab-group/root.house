import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { FamilyRole } from "@/domain/family/roles";
import { LinkButton } from "@/components/ui/link-button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { DeletePersonButton } from "@/components/person/delete-person-button";

/**
 * Avatar + name + birth/death years + edit/delete actions atop a Person's
 * profile. Birth/death place is deliberately not repeated here — it already
 * shows in the "Основная информация" section below, and per explicit user
 * request the header stays to just dates.
 */
export function PersonProfileHeader({
  person,
  personSlug,
  familyId,
  familySlug,
  role,
}: {
  person: PersonRecord;
  personSlug: string;
  familyId: string;
  familySlug: string;
  role: FamilyRole;
}) {
  const canEdit = role === "owner" || role === "editor";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-4">
        <PersonAvatar
          person={person}
          familyId={familyId}
          className="size-20! text-xl"
        />
        <div>
          <h1 className="font-heading text-3xl font-medium">
            {personDisplayName(person)}
          </h1>
          <p className="text-muted-foreground">
            {formatPartialDate(person.birthDate)}
            {!person.isLiving && ` — ${formatPartialDate(person.deathDate)}`}
          </p>
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <LinkButton
            variant="outline"
            size="sm"
            href={`/families/${familySlug}/people/${personSlug}/edit`}
            className="flex-1 sm:flex-none"
          >
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
              className="flex-1 sm:flex-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
