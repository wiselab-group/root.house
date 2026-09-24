import Image from "next/image";
import { personInitials } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.repository";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";

/**
 * A person's photo as a rounded square with the tree's sage identity ring —
 * the list-row avatar of the dark Person Profile / Story pages (family list,
 * «Люди в этой истории»), matching the redesign mock. The round PersonAvatar
 * stays everywhere else. Same /api/media route (family-membership checked)
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
        <Image
          src={`/api/media/${person.photoMediaId}?familyId=${familyId}`}
          alt=""
          fill
          sizes="48px"
          className="object-cover object-[50%_25%]"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          unoptimized
        />
      ) : (
        personInitials(person)
      )}
    </span>
  );
}
