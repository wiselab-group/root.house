import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canDelete, canEdit } from "@/domain/family/permissions";
import {
  getVisibleStory,
  getStoryPersonIds,
} from "@/domain/story/story.service";
import { listPeople } from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolveStoryIdBySlug } from "@/lib/resolve-story-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { PersonRecord } from "@/domain/person/person.repository";
import { getVisibleStoryPhotos } from "@/domain/media/media.service";
import { layoutStoryBody, readingMinutes } from "@/domain/story/story-layout";
import { StoryHero } from "@/components/story/story-hero";
import { StoryArticle } from "@/components/story/story-article";
import { StoryChaptersNav } from "@/components/story/story-chapters-nav";
import { StoryPeople } from "@/components/story/story-people";
import { buildStorySlides } from "@/components/story/build-story-slides";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/stories/[storySlug]">): Promise<Metadata> {
  const { slug, storySlug } = await params;
  const session = await auth();
  if (!session?.user) return {};

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const storyId = await resolveStoryIdBySlug(storySlug, familyId);
  const story = await getVisibleStory(storyId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!story) notFound();
  return { title: story.title };
}

export default async function StoryDetailPage({
  params,
}: PageProps<"/families/[slug]/stories/[storySlug]">) {
  const { slug, storySlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };
  const storyId = await resolveStoryIdBySlug(storySlug, familyId);
  const story = await getVisibleStory(storyId, familyId, viewer);
  if (!story) notFound();

  const [personIds, allPeople, family, storyPhotos] = await Promise.all([
    getStoryPersonIds(storyId),
    listPeople(familyId),
    getFamilySummary(familyId),
    getVisibleStoryPhotos(storyId, familyId, viewer),
  ]);
  const peopleById = new Map<string, PersonRecord>(
    allPeople.map((p) => [p.id, p]),
  );
  const people = personIds
    .map((id) => peopleById.get(id))
    .filter((p): p is PersonRecord => p != null);

  const slides = await buildStorySlides(storyPhotos, people, familyId);
  const layout = layoutStoryBody(story.body);

  const ownership = {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  };

  return (
    <main className="dark photo-backdrop min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Истории", href: `/families/${slug}/stories` },
          { label: story.title },
        ]}
      />
      <StoryHero
        title={story.title}
        privacyLevel={story.privacyLevel}
        createdAt={story.createdAt}
        readingMinutes={readingMinutes(layout.wordCount)}
        slides={slides}
        backHref={`/families/${slug}/stories`}
        editHref={
          canEdit(viewer, ownership)
            ? `/families/${slug}/stories/${storySlug}/edit`
            : null
        }
        deleteProps={
          canDelete(viewer, ownership) ? { familyId, storyId } : null
        }
      />
      {layout.chapters.length > 1 && (
        <StoryChaptersNav chapters={layout.chapters} />
      )}
      <StoryArticle layout={layout} />
      <div className="mx-auto flex max-w-[44rem] flex-col gap-12 px-4 pb-20 sm:px-8">
        <StoryPeople people={people} familyId={familyId} familySlug={slug} />
      </div>
    </main>
  );
}
