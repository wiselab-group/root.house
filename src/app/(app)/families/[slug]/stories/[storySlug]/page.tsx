import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
import {
  getVisibleStoryPhotos,
  getVisibleStoryTextPhotos,
} from "@/domain/media/media.service";
import { layoutStoryDoc, readingMinutes } from "@/domain/story/story-layout";
import { parseStoryMarkdown } from "@/domain/story/story-markdown";
import { storyPhotoIds } from "@/domain/story/story-doc";
import type { StoryRefs } from "@/components/story/article/story-refs";
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
  const t = await getTranslations("stories");
  const tn = await getTranslations("familyNav");
  const { slug, storySlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };
  const storyId = await resolveStoryIdBySlug(storySlug, familyId);
  const story = await getVisibleStory(storyId, familyId, viewer);
  if (!story) notFound();
  // Only its author gets this far for a draft (getVisibleStory), and a
  // draft has no reading view yet — it's still being written.
  if (story.status === "draft") {
    redirect(`/families/${slug}/stories/${storySlug}/edit`);
  }

  const doc = parseStoryMarkdown(story.body);
  const [personIds, allPeople, family, storyPhotos, textPhotos] =
    await Promise.all([
      getStoryPersonIds(storyId),
      listPeople(familyId),
      getFamilySummary(familyId),
      getVisibleStoryPhotos(storyId, familyId, viewer),
      getVisibleStoryTextPhotos(storyPhotoIds(doc), familyId, viewer),
    ]);
  const peopleById = new Map<string, PersonRecord>(
    allPeople.map((p) => [p.id, p]),
  );
  const people = personIds
    .map((id) => peopleById.get(id))
    .filter((p): p is PersonRecord => p != null);

  const slides = await buildStorySlides(storyPhotos, people, familyId);
  const layout = layoutStoryDoc(doc);
  // Mentions link only to people of this family; photos only the reader
  // may see (getVisibleStoryTextPhotos) — the rest render as plain text /
  // are left out (see StoryRefs).
  const refs: StoryRefs = {
    familyId,
    people: Object.fromEntries(
      allPeople.map((person) => [
        person.id,
        { href: `/families/${slug}/people/${person.slug}` },
      ]),
    ),
    photos: Object.fromEntries(
      textPhotos.map((photo) => [
        photo.id,
        {
          width: photo.width,
          height: photo.height,
          alt: photo.title ?? photo.description,
        },
      ]),
    ),
  };

  const ownership = {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  };

  return (
    <main className="dark photo-backdrop min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: t("title"), href: `/families/${slug}/stories` },
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
      <StoryArticle layout={layout} refs={refs} />
      <div className="mx-auto flex max-w-176 flex-col gap-12 px-4 pb-20 sm:px-8">
        <StoryPeople people={people} familyId={familyId} familySlug={slug} />
      </div>
    </main>
  );
}
