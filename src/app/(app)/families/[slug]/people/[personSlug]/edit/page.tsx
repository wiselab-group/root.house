import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { PersonForm } from "@/components/forms/person-form";
import { AvatarEditor } from "@/components/forms/avatar-editor";
import { updatePersonAction } from "@/actions/person.actions";
import { listPlaces } from "@/domain/place/place.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { personDisplayName } from "@/domain/person/display-name";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">): Promise<Metadata> {
  const locale = await getLocale();
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return {};

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "editor");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!person) notFound();
  const t = await getTranslations("people");
  return { title: t("editTitle", { name: personDisplayName(person, locale) }) };
}

export default async function EditPersonPage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">) {
  const tn = await getTranslations("familyNav");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "editor");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!person) notFound();
  const [places, family] = await Promise.all([
    listPlaces(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: tn("people"), href: `/families/${slug}/people` },
          {
            label: personDisplayName(person, locale),
            href: `/families/${slug}/people/${personSlug}`,
          },
          { label: tc("edit") },
        ]}
      />
      <div className="flex items-center gap-4">
        <AvatarEditor familyId={familyId} personId={personId} person={person} />
        <h1 className="font-heading text-title font-medium tracking-tight text-balance">
          {personDisplayName(person, locale)}
        </h1>
      </div>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        {/* .bind() on the real "use server" action, not a closure — see
            note in people/new/page.tsx for why this distinction matters. */}
        <PersonForm
          action={updatePersonAction.bind(null, familyId, personId)}
          person={person}
          places={places}
          submitLabel={tc("save")}
          submitPendingLabel={tc("saving")}
          cancelHref={`/families/${slug}/people/${personSlug}`}
        />
      </section>
    </main>
  );
}
