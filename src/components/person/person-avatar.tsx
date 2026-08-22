import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { personInitials } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.repository";

/**
 * A Person's circular profile photo, with initials as the fallback while no
 * photo is set (or while it's loading). Used on the profile header, the
 * /people list cards, and (in a size-adapted form) the family tree node —
 * same underlying photoMediaId, three different presentations, per the
 * project's "one graph, many UI representations" principle.
 *
 * Served through /api/media/[id] (never a raw Blob URL, see
 * PersonMediaGallery) so avatar images stay behind the same family-membership
 * check as every other photo — there is no publicly guessable avatar URL.
 */
export function PersonAvatar({
  person,
  familyId,
  size = "default",
  className,
}: {
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder" | "photoMediaId"
  >;
  familyId: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    // className is passed after the built-in size-* utilities in the source,
    // but Tailwind resolves conflicts by the *generated* stylesheet's own
    // ordering, not call-site order — a plain override here isn't reliably
    // guaranteed to win against the `data-[size=lg]:size-10` variant.
    // Callers needing a larger-than-"lg" avatar (the profile header) pass an
    // explicit `size-*!` important-suffixed class for that reason.
    <Avatar size={size} className={className}>
      {person.photoMediaId && (
        <AvatarImage
          src={`/api/media/${person.photoMediaId}?familyId=${familyId}`}
          alt=""
        />
      )}
      <AvatarFallback>{personInitials(person)}</AvatarFallback>
    </Avatar>
  );
}
