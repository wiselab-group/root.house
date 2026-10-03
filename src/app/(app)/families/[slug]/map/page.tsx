import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilyMapData } from "@/domain/place/place-map.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { LinkButton } from "@/components/ui/link-button";
import { FamilyMapLoader } from "@/components/map/family/family-map-loader";
import type { MapFocus } from "@/components/map/family/use-family-map";
import type { FamilyMapData } from "@/domain/place/place-map.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

/** ?place= / ?branch= / ?person=<slug> open the map on that view — the
 *  profile's «show on the map» and shared links land here. Unknown ids
 *  (or ones this member can't see) fall back to the overview. */
function initialFocus(
  data: FamilyMapData,
  params: Record<string, string | string[] | undefined>,
): MapFocus {
  const { place, branch, person } = params;
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

  if (!data.places.some((p) => p.latitude != null && p.longitude != null)) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <SetBreadcrumbs items={breadcrumbItems} />
        <Card>
          <CardHeader>
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin
                className="size-6"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <CardTitle className="mt-4">{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={`/families/${slug}/places`}>
              {t("managePlaces")}
            </LinkButton>
          </CardContent>
        </Card>
      </main>
    );
  }

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
