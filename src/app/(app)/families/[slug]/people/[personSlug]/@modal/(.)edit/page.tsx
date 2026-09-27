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
 * /…/edit intercepted from the profile — the same form as the standalone
 * edit page (../../edit/page.tsx), inside the EditPanel from ./layout.tsx.
 */
export default async function EditPersonPanelPage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">) {
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { slug, personSlug } = await params;
  const data = await loadPersonEdit(slug, personSlug);
  if (!data) return null;
  const { familyId, personId, person, places } = data;

  return (
    <>
      <EditPanelHeader
        title={personDisplayName(person, locale)}
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
