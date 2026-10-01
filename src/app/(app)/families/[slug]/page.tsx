import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FamilyTreeLaunchCard } from "@/components/family/family-nav-card";
import { FamilySectionLinks } from "@/components/family/family-section-links";
import { FamilyHomeTop } from "@/components/family/family-home-top";
import { RecentMemories } from "@/components/family/recent-memories";
import { FamilyHomeActivity } from "@/components/family/family-home-activity";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySummary } from "@/domain/family/family.service";
import {
  listPeople,
  filterVisiblePersons,
} from "@/domain/person/person.service";
import { listPlaces } from "@/domain/place/place.service";
import {
  listStories,
  filterVisibleStories,
} from "@/domain/story/story.service";
import {
  getFamilyGallery,
  filterVisibleGalleryPhotos,
} from "@/domain/media/media.service";
import { listActivityLog } from "@/domain/activity-log/activity-log.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const family = await getFamilySummary(familyId);
  return { title: family?.name ?? slug };
}

const RECENT_MEMORIES_LIMIT = 6;
const RECENT_ACTIVITY_LIMIT = 3;

export default async function FamilyDashboardPage({
  params,
}: PageProps<"/families/[slug]">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };

  const [family, allPeople, places, allPhotos, allStories, activityEntries] =
    await Promise.all([
      getFamilySummary(familyId),
      listPeople(familyId),
      listPlaces(familyId),
      getFamilyGallery(familyId),
      listStories(familyId),
      // Same rule as Settings' own Активность семьи section — entityLabel
      // is an unfiltered snapshot string (e.g. a Person's name), so surfacing
      // it to non-owners here would bypass privacy filtering that every
      // other view on this page respects. See activity-log.repository.ts.
      // Fetches one extra row (limit+1) purely to know whether "Ещё" should
      // render — never rendered/counted itself, sliced off below.
      member.role === "owner"
        ? listActivityLog(familyId, { limit: RECENT_ACTIVITY_LIMIT + 1 })
        : [],
    ]);

  const people = filterVisiblePersons(allPeople, viewer);
  const visiblePhotos = filterVisibleGalleryPhotos(allPhotos, viewer);
  const stories = filterVisibleStories(allStories, viewer);
  const photos = visiblePhotos.slice(0, RECENT_MEMORIES_LIMIT);
  const hasMoreActivity = activityEntries.length > RECENT_ACTIVITY_LIMIT;
  const recentActivity = activityEntries.slice(0, RECENT_ACTIVITY_LIMIT);
  const t = await getTranslations();

  return (
    <main className="dark photo-backdrop min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: t("families.title"), href: "/families" },
          { label: family?.name ?? slug },
        ]}
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-14 px-4 pt-14 pb-20 sm:px-8 sm:pt-20">
        <FamilyHomeTop
          familySlug={slug}
          name={family?.name ?? slug}
          description={family?.description ?? null}
          userName={session.user.name}
          people={people}
          placeCount={places.length}
          photos={visiblePhotos}
          stories={stories}
        />
        <div className="animate-content-enter">
          <FamilyTreeLaunchCard
            href={`/families/${slug}/tree`}
            description={t("familyNav.treeDescription")}
          />
        </div>

        {photos.length > 0 && (
          <div
            className="animate-content-enter"
            style={{ animationDelay: "80ms" }}
          >
            <RecentMemories
              photos={photos}
              familyId={familyId}
              familySlug={slug}
              canTag={member.role === "owner" || member.role === "editor"}
            />
          </div>
        )}

        {member.role === "owner" && recentActivity.length > 0 && (
          <div
            className="animate-content-enter"
            style={{ animationDelay: "120ms" }}
          >
            <FamilyHomeActivity
              familySlug={slug}
              entries={recentActivity}
              hasMore={hasMoreActivity}
            />
          </div>
        )}

        <FamilySectionLinks familySlug={slug} />
      </div>
    </main>
  );
}
