import { ArchiveImage } from "@/components/media/archive-image";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media-url";
import { personInitials } from "@/domain/person/display-name";
import type { TreePersonClientPayload } from "@/domain/tree/tree-adapter";

/**
 * Small round portrait for the Relationship Trace panel's path. Ringed in
 * terracotta: everyone shown here is on the traced path, the same color the
 * path's cards and lines carry on the tree. `isCommonAncestor` fills it
 * solid and haloes it — the turning point of the path.
 */
export function KinshipAvatar({
  person,
  familyId,
  isCommonAncestor = false,
  className,
}: {
  person: TreePersonClientPayload;
  familyId: string;
  isCommonAncestor?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-muted text-[0.65rem] font-semibold text-muted-foreground",
        isCommonAncestor &&
          "bg-primary text-primary-foreground ring-4 ring-primary/25",
        className,
      )}
    >
      {person.photoMediaId ? (
        <ArchiveImage
          src={mediaUrl(person.photoMediaId, familyId, "thumb")}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        personInitials(person)
      )}
    </span>
  );
}
