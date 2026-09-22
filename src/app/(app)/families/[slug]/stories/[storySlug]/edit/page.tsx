import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canEdit } from "@/domain/family/permissions";
import {
  getVisibleStory,
  getStoryPersonIds,
} from "@/domain/story/story.service";
import { listPeople } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolveStoryIdBySlug } from "@/lib/resolve-story-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { EditStoryForm } from "@/components/forms/edit-story-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/stories/[storySlug]/edit">): Promise<Metadata> {
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
  if (!story) return {};
  return { title: `Редактировать — ${story.title}` };
}

export default async function EditStoryPage({
  params,
}: PageProps<"/families/[slug]/stories/[storySlug]/edit">) {
  const { slug, storySlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  const viewer = { userId: session.user.id, role: member.role };
  const storyId = await resolveStoryIdBySlug(storySlug, familyId);
  const story = await getVisibleStory(storyId, familyId, viewer);
  if (!story) notFound();
  if (
    !canEdit(viewer, {
      privacyLevel: story.privacyLevel,
      createdBy: story.authorId,
    })
  ) {
    notFound();
  }

  const [personIds, allPeople, family] = await Promise.all([
    getStoryPersonIds(storyId),
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const people = personIds
    .map((id) => peopleById.get(id))
    .filter((p) => p != null)
    .map((p) => ({ id: p.id, name: personDisplayName(p) }));

  const storyHref = `/families/${slug}/stories/${storySlug}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Истории", href: `/families/${slug}/stories` },
          { label: story.title, href: storyHref },
          { label: "Редактировать" },
        ]}
      />
      <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
        {story.title}
      </h1>

      <EditStoryForm
        familyId={familyId}
        storyId={storyId}
        title={story.title}
        body={story.body}
        privacyLevel={story.privacyLevel}
        people={people}
        cancelHref={storyHref}
      />
    </main>
  );
}
