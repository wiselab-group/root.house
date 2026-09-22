import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canCreate } from "@/domain/family/permissions";
import {
  listStories,
  filterVisibleStories,
  getStoryPersonIdsBatch,
} from "@/domain/story/story.service";
import { listPeople } from "@/domain/person/person.service";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { StoriesList } from "@/components/story/stories-list";
import { AddStoryFullForm } from "@/components/forms/add-story-full-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { storyCountLabel } from "@/domain/shared/pluralize-ru";
import type { PersonRecord } from "@/domain/person/person.repository";

export const metadata: Metadata = {
  title: "Истории",
};

export default async function StoriesPage({
  params,
}: PageProps<"/families/[slug]/stories">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };
  const canAdd = canCreate(member.role, "story");

  const [allStories, allPeople, family] = await Promise.all([
    listStories(familyId),
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const stories = filterVisibleStories(allStories, viewer);
  const peopleById = new Map<string, PersonRecord>(
    allPeople.map((p) => [p.id, p]),
  );
  const personIdsByStoryId = await getStoryPersonIdsBatch(
    stories.map((s) => s.id),
  );
  const peopleByStoryId = new Map<string, PersonRecord[]>(
    stories.map((story) => [
      story.id,
      (personIdsByStoryId.get(story.id) ?? [])
        .map((id) => peopleById.get(id))
        .filter((p): p is PersonRecord => p != null),
    ]),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Истории" },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Истории
        </h1>
        <p className="text-muted-foreground">
          {stories.length > 0
            ? `${storyCountLabel(stories.length)} — то, что стоит помнить и передать дальше.`
            : "Семейные истории и воспоминания."}
        </p>
      </div>

      {stories.length === 0 ? (
        <EmptyStoriesState canAdd={canAdd} familyId={familyId} />
      ) : (
        <StoriesList
          familySlug={slug}
          stories={stories}
          peopleByStoryId={peopleByStoryId}
        />
      )}

      {stories.length > 0 && canAdd && (
        <CollapsibleForm triggerLabel="Добавить историю">
          <AddStoryFullForm familyId={familyId} />
        </CollapsibleForm>
      )}
    </main>
  );
}

/** Same teaching-empty-state shape as /people, /places — a concrete next
 *  step, not a bare "nothing here". Non-contributors see plain copy with
 *  no dead-end CTA they can't act on. */
function EmptyStoriesState({
  canAdd,
  familyId,
}: {
  canAdd: boolean;
  familyId: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">
          Семейные истории пока не рассказаны
        </h2>
        <p className="text-muted-foreground">
          Как познакомились бабушка с дедушкой, переезд в другой город, летние
          каникулы у родных — запишите то, что стоит передать дальше.
        </p>
      </div>
      {canAdd && (
        <CollapsibleForm triggerLabel="Добавить первую историю">
          <AddStoryFullForm familyId={familyId} />
        </CollapsibleForm>
      )}
    </div>
  );
}
