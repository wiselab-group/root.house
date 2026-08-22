import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { FamilyProvider } from "@/components/family/family-context";

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

  return (
    <FamilyProvider
      value={{ familyId, familyName: family.name, familySlug: family.slug, role: member.role }}
    >
      {children}
    </FamilyProvider>
  );
}
