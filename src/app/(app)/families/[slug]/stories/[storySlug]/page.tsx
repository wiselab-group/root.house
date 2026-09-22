import Link from "next/link";
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
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolveStoryIdBySlug } from "@/lib/resolve-story-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { PrivacyBadge } from "@/components/person/privacy-badge";
import { ProfileSection } from "@/components/person/profile-section";
import { PersonAvatar } from "@/components/person/person-avatar";
import { DeleteStoryDetailButton } from "@/components/story/delete-story-detail-button";
import { LinkButton } from "@/components/ui/link-button";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { PersonRecord } from "@/domain/person/person.repository";

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

  const [personIds, allPeople, family] = await Promise.all([
    getStoryPersonIds(storyId),
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const peopleById = new Map<string, PersonRecord>(
    allPeople.map((p) => [p.id, p]),
  );
  const people = personIds
    .map((id) => peopleById.get(id))
    .filter((p): p is PersonRecord => p != null);

  const ownership = {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  };
  const showEdit = canEdit(viewer, ownership);
  const showDelete = canDelete(viewer, ownership);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Истории", href: `/families/${slug}/stories` },
          { label: story.title },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <PrivacyBadge privacyLevel={story.privacyLevel} />
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            {story.title}
          </h1>
        </div>
        {(showEdit || showDelete) && (
          <div className="flex gap-2">
            {showEdit && (
              <LinkButton
                variant="outline"
                size="sm"
                href={`/families/${slug}/stories/${storySlug}/edit`}
                className="flex-1 sm:flex-none"
              >
                Редактировать
              </LinkButton>
            )}
            {showDelete && (
              <DeleteStoryDetailButton
                familyId={familyId}
                storyId={storyId}
                storyTitle={story.title}
                className="flex-1 sm:flex-none"
              />
            )}
          </div>
        )}
      </div>

      <p className="text-sm whitespace-pre-wrap">{story.body}</p>

      {people.length > 0 && (
        <ProfileSection title="Люди">
          <ul className="flex flex-col divide-y divide-border">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <PersonAvatar person={person} familyId={familyId} size="sm" />
                <Link
                  href={`/families/${slug}/people/${person.slug}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {personDisplayName(person)}
                </Link>
              </li>
            ))}
          </ul>
        </ProfileSection>
      )}
    </main>
  );
}
