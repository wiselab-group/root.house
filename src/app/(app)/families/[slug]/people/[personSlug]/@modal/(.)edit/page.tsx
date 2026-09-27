import { PersonEditPanelContent } from "../../edit/panel-content";

/** /…/edit intercepted from the profile — inside the EditPanel from
 *  ./layout.tsx, over the profile that's still rendered underneath. */
export default async function EditPersonPanelPage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">) {
  const { slug, personSlug } = await params;
  return <PersonEditPanelContent slug={slug} personSlug={personSlug} />;
}
