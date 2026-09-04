import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { getFamilySummary } from "@/domain/family/family.service";
import { getPerson } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { FamilyProvider } from "@/components/family/family-context";
import { SetFamilyNav } from "@/components/family-nav-context";

export default async function FamilyLayout({
  children,
  params,
}: LayoutProps<"/families/[slug]">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  // Resolves the /families/[slug] URL segment to a familyId — calls
  // notFound() itself for an unknown slug (see resolveFamilyIdBySlug).
  const familyId = await resolveFamilyIdBySlug(slug);

  // requireFamilyAccess is the single authorization checkpoint: it throws
  // ForbiddenError for both "not a member" and "family doesn't exist" cases,
  // so a guessed/foreign slug never leaks whether the family exists — it
  // renders the same 404 either way.
  let member;
  try {
    member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  const family = await getFamilySummary(familyId);
  if (!family) {
    notFound();
  }

  // Resolved here (not in the settings page) so every page under this
  // layout can read it from FamilyProvider without each re-fetching —
  // `getPerson`'s own family_id check is what makes a stale/foreign id
  // (the referenced Person since deleted) safely resolve to null, same as
  // tree/page.tsx's own fallback treats it as "no preference set".
  const defaultFocusPerson = member.defaultFocusPersonId
    ? await getPerson(member.defaultFocusPersonId, familyId)
    : null;

  return (
    <FamilyProvider
      value={{
        familyId,
        familyName: family.name,
        familyDescription: family.description ?? "",
        familySlug: family.slug,
        role: member.role,
        defaultFocusPerson: defaultFocusPerson
          ? {
              id: defaultFocusPerson.id,
              name: personDisplayName(defaultFocusPerson),
            }
          : null,
      }}
    >
      {/* Same 4 destinations as the dashboard's FamilyNavCard grid
          (families/[slug]/page.tsx) — published here so they're available in
          AppHeader's mobile panel on every page under this family section,
          not just the dashboard itself. */}
      <SetFamilyNav
        items={[
          {
            href: `/families/${slug}/tree`,
            icon: "tree",
            label: "Семейное дерево",
          },
          { href: `/families/${slug}/people`, icon: "people", label: "Люди" },
          { href: `/families/${slug}/places`, icon: "places", label: "Места" },
          {
            href: `/families/${slug}/settings`,
            icon: "settings",
            label: "Настройки",
          },
        ]}
      />
      {children}
    </FamilyProvider>
  );
}
