import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { personInitials } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.repository";

/**
 * A person's photo as a rounded square with the tree's sage identity ring —
 * the one list-row avatar of the app (the profile's family list, «Люди в
 * этой истории», the /people list), matching the redesign mock; the round
 * PersonAvatar it replaced is gone. Same /api/media route (family-membership checked)
 * as every other photo; initials when there's no photo yet.
 */
export function PersonThumb({
  person,
  familyId,
}: {
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder" | "photoMediaId"
  >;
  familyId: string;
}) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-glass-strong text-sm font-medium text-foreground/60 ring-[1.5px] ring-tree-accent">
      {person.photoMediaId ? (
        <ArchiveImage
          src={mediaUrl(person.photoMediaId, familyId, "thumb")}
          alt=""
          fill
          sizes="48px"
          className="object-cover object-[50%_25%]"
        />
      ) : (
        personInitials(person)
      )}
    </span>
  );
}
