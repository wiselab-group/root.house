import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  canEditStory,
  getMyStoryDraft,
  getVisibleStory,
  getStoryPersonIds,
} from "@/domain/story/story.service";
import { listPeople } from "@/domain/person/person.service";
import { getVisibleStoryPhotos } from "@/domain/media/media.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolveStoryIdBySlug } from "@/lib/resolve-story-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { EditStoryForm } from "@/components/forms/edit-story-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { DeleteStoryDetailButton } from "@/components/story/delete-story-detail-button";

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
  const t = await getTranslations("stories");
  return {
    title:
      story.status === "draft"
        ? t("draftTitle", { title: story.title || t("untitled") })
        : t("editTitle", { title: story.title }),
  };
}

export default async function EditStoryPage({
  params,
}: PageProps<"/families/[slug]/stories/[storySlug]/edit">) {
  const tc = await getTranslations("common");
  const t = await getTranslations("stories");
  const tn = await getTranslations("familyNav");
  const locale = await getLocale();
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
  if (!story || !canEditStory(viewer, story)) notFound();
  const isDraft = story.status === "draft";

  const [personIds, allPeople, family, serverDraft, storyPhotos] =
    await Promise.all([
      getStoryPersonIds(storyId),
      listPeople(familyId),
      getFamilySummary(familyId),
      // A draft story's own row is already the latest autosave.
      isDraft ? null : getMyStoryDraft(storyId, session.user.id, familyId),
      getVisibleStoryPhotos(storyId, familyId, viewer),
    ]);
  const photos = storyPhotos.map((photo) => ({
    id: photo.id,
    alt: photo.title ?? photo.description,
  }));
  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const people = personIds
    .map((id) => peopleById.get(id))
    .filter((p) => p != null)
    .map((p) => ({ id: p.id, name: personDisplayName(p, locale) }));

  const storiesHref = `/families/${slug}/stories`;
  const storyHref = `${storiesHref}/${storySlug}`;
  const label = story.title || t("untitled");

  return (
    <main className="min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: t("title"), href: storiesHref },
          // A draft has no page of its own to link back to yet.
          ...(isDraft
            ? [{ label: t("draftBadge") }]
            : [{ label: story.title, href: storyHref }, { label: tc("edit") }]),
        ]}
      />
      {/* The editable title field is the page's visual heading. */}
      <h1 className="sr-only">
        {isDraft
          ? t("draftTitle", { title: label })
          : t("editTitle", { title: label })}
      </h1>

      <EditStoryForm
        familyId={familyId}
        storyId={storyId}
        title={story.title}
        body={story.body}
        privacyLevel={story.privacyLevel}
        people={people}
        photos={photos}
        isDraft={isDraft}
        serverDraft={
          serverDraft && { title: serverDraft.title, body: serverDraft.body }
        }
        cancelHref={isDraft ? storiesHref : storyHref}
      />
      {/* Outside the editor's <form> — a button inside it would submit it.
          A published story is deleted from its own page's «⋮» menu. */}
      {isDraft && (
        <div className="mx-auto w-full max-w-176 px-4 pb-16 sm:px-8">
          <DeleteStoryDetailButton
            familyId={familyId}
            storyId={storyId}
            storyTitle={label}
            triggerLabel={t("deleteDraft")}
          />
        </div>
      )}
    </main>
  );
}
