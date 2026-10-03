import { redirect } from "next/navigation";

/** Places are managed on the family map now (search → every place, add,
 *  set a point, edit) — old links and bookmarks land there. */
export default async function PlacesPage({
  params,
}: PageProps<"/families/[slug]/places">) {
  const { slug } = await params;
  redirect(`/families/${slug}/map?panel=places`);
}
