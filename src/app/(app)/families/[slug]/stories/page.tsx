import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canCreate } from "@/domain/family/permissions";
import {
  listStories,
  listMyDrafts,
  filterVisibleStories,
  getStoryPersonIdsBatch,
} from "@/domain/story/story.service";
import { listPeople } from "@/domain/person/person.service";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { StoriesList } from "@/components/story/stories-list";
import { NewStoryButton } from "@/components/story/new-story-button";
import { MyDraftsList } from "@/components/story/my-drafts-list";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { PersonRecord } from "@/domain/person/person.repository";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stories");
  return { title: t("title") };
}

export default async function StoriesPage({
  params,
}: PageProps<"/families/[slug]/stories">) {
  const tCount = await getTranslations("counts");
  const t = await getTranslations("stories");
  const tn = await getTranslations("familyNav");
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };
  const canAdd = canCreate(member.role, "story");

  const [allStories, allPeople, family, myDrafts] = await Promise.all([
    listStories(familyId),
    listPeople(familyId),
    getFamilySummary(familyId),
    listMyDrafts(familyId, session.user.id),
  ]);
  // An untouched draft (opened, left without typing) isn't worth listing —
  // «Новая история» reuses it anyway (story.service.ts::createDraftStory).
  const drafts = myDrafts.filter((d) => d.title !== "" || d.body !== "");
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
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: t("title") },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-title font-medium tracking-tight text-balance">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {stories.length > 0
              ? t("countLead", {
                  stories: tCount("stories", { count: stories.length }),
                })
              : t("lead")}
          </p>
        </div>
        {canAdd && stories.length > 0 && <NewStoryButton familyId={familyId} />}
      </div>

      {drafts.length > 0 && <MyDraftsList familySlug={slug} drafts={drafts} />}

      {stories.length === 0 ? (
        <EmptyStoriesState canAdd={canAdd} familyId={familyId} />
      ) : (
        <StoriesList
          familySlug={slug}
          stories={stories}
          peopleByStoryId={peopleByStoryId}
        />
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
  const t = useTranslations("stories");
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">{t("emptyTitle")}</h2>
        <p className="text-muted-foreground">{t("emptyBody")}</p>
      </div>
      {canAdd && <NewStoryButton familyId={familyId} />}
    </div>
  );
}
