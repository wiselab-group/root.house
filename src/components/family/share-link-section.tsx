import type { ShareLinkWithStatus } from "@/domain/share-link/share-link.service";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { CreateShareLinkForm } from "./create-share-link-form";
import { ShareLinksTabs } from "./share-links-tabs";

/**
 * Server Component (fetches its own focus-person names, since
 * listShareLinksForFamilyWithStatus only returns the raw ids — settings
 * page passes the already-fetched share links down) — same layering as
 * FamilyMembersSection: interactive bits pushed into leaf Client Components.
 */
export async function ShareLinkSection({
  familyId,
  shareLinks,
}: {
  familyId: string;
  shareLinks: ShareLinkWithStatus[];
}) {
  const persons = await listPersonsByFamily(familyId);
  const focusPersonNames = Object.fromEntries(
    persons.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Без имени",
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      {shareLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Ссылки</h3>
          <ShareLinksTabs
            familyId={familyId}
            shareLinks={shareLinks}
            focusPersonNames={focusPersonNames}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Создать ссылку</h3>
        <CreateShareLinkForm familyId={familyId} />
      </div>
    </div>
  );
}
