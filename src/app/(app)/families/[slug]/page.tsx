import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Users, Images, MapPin, Settings } from "lucide-react";
import {
  FamilyNavCard,
  FamilyTreeLaunchCard,
} from "@/components/family/family-nav-card";
import { FamilyHomeStats } from "@/components/family/family-home-stats";
import { RecentMemories } from "@/components/family/recent-memories";
import { ActivityLogSection } from "@/components/family/activity-log-section";
import { ProfileSection } from "@/components/person/profile-section";
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

  const [family, allPeople, places, allPhotos, activityEntries] =
    await Promise.all([
      getFamilySummary(familyId),
      listPeople(familyId),
      listPlaces(familyId),
      getFamilyGallery(familyId),
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
  const photos = visiblePhotos.slice(0, RECENT_MEMORIES_LIMIT);
  const hasMoreActivity = activityEntries.length > RECENT_ACTIVITY_LIMIT;
  const recentActivity = activityEntries.slice(0, RECENT_ACTIVITY_LIMIT);

  const secondaryLinks = [
    {
      href: `/families/${slug}/people`,
      icon: Users,
      label: "Люди",
      description: "Профили, поиск по имени и году",
    },
    {
      href: `/families/${slug}/photos`,
      icon: Images,
      label: "Архив",
      description: "Фото, видео и документы семьи",
    },
    {
      href: `/families/${slug}/places`,
      icon: MapPin,
      label: "Места",
      description: "Места рождения, проживания и событий",
    },
    {
      href: `/families/${slug}/settings`,
      icon: Settings,
      label: "Настройки",
      description: "Название, ссылка и описание архива",
    },
  ] as const;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug },
        ]}
      />
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {family?.name ?? slug}
        </h1>
        {family?.description && (
          <p className="max-w-prose text-muted-foreground">
            {family.description}
          </p>
        )}
        <FamilyHomeStats
          personCount={people.length}
          placeCount={places.length}
          photoCount={visiblePhotos.length}
        />
      </div>

      <div className="animate-content-enter">
        <FamilyTreeLaunchCard
          href={`/families/${slug}/tree`}
          description="Интерактивная схема родственных связей"
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
          />
        </div>
      )}

      {member.role === "owner" && recentActivity.length > 0 && (
        <div
          className="animate-content-enter"
          style={{ animationDelay: "120ms" }}
        >
          <ProfileSection title="Активность семьи">
            <ActivityLogSection entries={recentActivity} />
            {hasMoreActivity && (
              <Link
                href={`/families/${slug}/settings#activity`}
                className="group flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Ещё
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            )}
          </ProfileSection>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Другие разделы архива</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {secondaryLinks.map((link, index) => (
            <div
              key={link.href}
              className="animate-content-enter h-full"
              style={{ animationDelay: `${160 + index * 60}ms` }}
            >
              <FamilyNavCard {...link} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
