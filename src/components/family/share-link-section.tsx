import { getTranslations } from "next-intl/server";
import type { ShareLinkWithStatus } from "@/domain/share-link/share-link.service";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { ProfileSectionWithAdd } from "@/components/person/profile-section-with-add";
import { CreateShareLinkForm } from "./create-share-link-form";
import { ShareLinksTabs } from "./share-links-tabs";

/**
 * Server Component (fetches its own focus-person names, since
 * listShareLinksForFamilyWithStatus only returns the raw ids — settings
 * page passes the already-fetched share links down) — same layering as
 * FamilyMembersSection: interactive bits pushed into leaf Client Components.
 *
 * The create form isn't on the page: «Новая ссылка» on the heading row
 * opens it in an EditPanel (user's pick 2026-10-01, same as «Добавить
 * событие»), so the section is just the list of links.
 */
export async function ShareLinkSection({
  familyId,
  shareLinks,
  title,
  description,
}: {
  familyId: string;
  shareLinks: ShareLinkWithStatus[];
  title: string;
  description: string;
}) {
  const persons = await listPersonsByFamily(familyId);
  const t = await getTranslations("shareLinks");
  const tc = await getTranslations("common");
  const focusPersonNames = Object.fromEntries(
    persons.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
        tc("unnamed"),
    ]),
  );

  return (
    <ProfileSectionWithAdd
      title={title}
      description={description}
      addLabel={t("newLink")}
      panelTitle={t("newLink")}
      form={<CreateShareLinkForm familyId={familyId} />}
    >
      {shareLinks.length > 0 ? (
        <ShareLinksTabs
          familyId={familyId}
          shareLinks={shareLinks}
          focusPersonNames={focusPersonNames}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </ProfileSectionWithAdd>
  );
}
