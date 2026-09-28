import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { personInitials } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.repository";

/**
 * A person's photo as a rounded square with the tree's sage identity ring —
 * the one list-row avatar of the app (the profile's family list, «Люди в
 * этой истории», the /people list, every person picker's rows), matching the redesign mock; the round
 * PersonAvatar it replaced is gone. Same /api/media route (family-membership checked)
 * as every other photo; initials when there's no photo yet.
 */
export function PersonThumb({
  person,
  familyId,
  size = "md",
}: {
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder" | "photoMediaId"
  >;
  familyId: string;
  /** `sm` — the person-picker row (components/person-picker). */
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-glass-strong font-medium text-foreground/60 ring-tree-accent",
        size === "sm"
          ? "size-8 rounded-[10px] text-[11px] ring-1"
          : "size-12 rounded-[14px] text-sm ring-[1.5px]",
      )}
    >
      {person.photoMediaId ? (
        <ArchiveImage
          src={mediaUrl(person.photoMediaId, familyId, "thumb")}
          alt=""
          fill
          sizes={size === "sm" ? "32px" : "48px"}
          className="object-cover object-[50%_25%]"
        />
      ) : (
        personInitials(person)
      )}
    </span>
  );
}
