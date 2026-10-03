import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilyMapData } from "@/domain/place/place-map.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { FamilyMapLoader } from "@/components/map/family/family-map-loader";
import type { MapFocus } from "@/components/map/family/use-family-map";
import type { FamilyMapData } from "@/domain/place/place-map.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

/** ?place= / ?branch= / ?person=<slug> / ?panel=places open the map on
 *  that view — the profile's «show on the map», shared links and the old
 *  /places page land here. Unknown ids (or ones this member can't see)
 *  fall back to the overview. An empty map still opens: its overview
 *  invites the first place. */
function initialFocus(
  data: FamilyMapData,
  params: Record<string, string | string[] | undefined>,
): MapFocus {
  const { place, branch, person, panel } = params;
  // The old /places page lands here with the place list open.
  if (panel === "places") return { kind: "search" };
  if (typeof person === "string") {
    const found = Object.values(data.people).find((p) => p.slug === person);
    if (found) return { kind: "person", personId: found.id };
  }
  if (
    typeof branch === "string" &&
    data.branches.some((b) => b.rootId === branch)
  ) {
    return { kind: "branch", rootId: branch };
  }
  if (typeof place === "string" && data.places.some((p) => p.id === place)) {
    return { kind: "place", placeId: place };
  }
  return { kind: "overview" };
}

export default async function FamilyMapPage({
  params,
  searchParams,
}: PageProps<"/families/[slug]/map">) {
  const t = await getTranslations("map");
  const tn = await getTranslations("familyNav");
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const canEdit = member.role === "owner" || member.role === "editor";
  const [data, family] = await Promise.all([
    getFamilyMapData(
      familyId,
      { userId: session.user.id, role: member.role },
      await getLocale(),
      canEdit,
    ),
    getFamilySummary(familyId),
  ]);

  const breadcrumbItems = [
    { label: tn("myFamilies"), href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    { label: t("title") },
  ];

  return (
    // Full-bleed like the tree: the map is the page, the breadcrumb trail
    // already names it — no heading above it to push it off-screen.
    <main className="relative">
      <SetBreadcrumbs items={breadcrumbItems} />
      <FamilyMapLoader
        data={data}
        familyId={familyId}
        familySlug={slug}
        canEdit={canEdit}
        initialFocus={initialFocus(data, await searchParams)}
      />
    </main>
  );
}
