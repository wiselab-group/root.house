import { getLocale, getTranslations } from "next-intl/server";
import { loadPersonEdit } from "@/lib/load-person-edit";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonForm } from "@/components/forms/person-form";
import { AvatarEditor } from "@/components/forms/avatar-editor";
import { updatePersonAction } from "@/actions/person.actions";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";

/**
 * The person edit panel's contents (portrait + form) — shared by the
 * intercepted @modal/(.)edit route and the hard-load edit/page.tsx, both of
 * which wrap it in an EditPanel over the profile.
 */
export async function PersonEditPanelContent({
  slug,
  personSlug,
}: {
  slug: string;
  personSlug: string;
}) {
  const tc = await getTranslations("common");
  const t = await getTranslations("people");
  const locale = await getLocale();
  const data = await loadPersonEdit(slug, personSlug);
  if (!data) return null;
  const { familyId, personId, person, places } = data;

  return (
    <>
      <EditPanelHeader
        title={t("editTitle", { name: personDisplayName(person, locale) })}
        titleHidden
        leading={
          <AvatarEditor
            familyId={familyId}
            personId={personId}
            person={person}
          />
        }
      />
      <EditPanelBody>
        {/* .bind() on the real "use server" action — see people/new/page.tsx. */}
        <PersonForm
          action={updatePersonAction.bind(null, familyId, personId)}
          person={person}
          places={places}
          submitLabel={tc("save")}
          submitPendingLabel={tc("saving")}
        />
      </EditPanelBody>
    </>
  );
}
