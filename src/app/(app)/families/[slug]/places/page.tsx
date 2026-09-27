import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPlaces } from "@/domain/place/place.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { PlacesList } from "@/components/place/places-list";
import { CreatePlaceForm } from "@/components/forms/create-place-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("places");
  return { title: t("title") };
}

export default async function PlacesPage({
  params,
}: PageProps<"/families/[slug]/places">) {
  const tCount = await getTranslations("counts");
  const t = await getTranslations("places");
  const tn = await getTranslations("familyNav");
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const canEdit = member.role === "owner" || member.role === "editor";
  const [places, family] = await Promise.all([
    listPlaces(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: t("title") },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-title font-medium tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {places.length > 0
            ? t("countLead", {
                places: tCount("places", { count: places.length }),
              })
            : t("lead")}
        </p>
      </div>

      {places.length === 0 ? (
        <EmptyPlacesState canEdit={canEdit} familyId={familyId} />
      ) : (
        <PlacesList familyId={familyId} places={places} canEdit={canEdit} />
      )}

      {places.length > 0 && canEdit && (
        <CollapsibleForm triggerLabel={t("add")}>
          <CreatePlaceForm familyId={familyId} />
        </CollapsibleForm>
      )}
    </main>
  );
}

/** Same teaching-empty-state shape as /families and /people — a concrete
 *  next step, not a bare "nothing here". Non-editors see plain copy with
 *  no dead-end CTA they can't act on. */
function EmptyPlacesState({
  canEdit,
  familyId,
}: {
  canEdit: boolean;
  familyId: string;
}) {
  const t = useTranslations("places");
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPin className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">{t("emptyTitle")}</h2>
        <p className="text-muted-foreground">{t("emptyBody")}</p>
      </div>
      {canEdit && (
        <CollapsibleForm triggerLabel={t("add")}>
          <CreatePlaceForm familyId={familyId} />
        </CollapsibleForm>
      )}
    </div>
  );
}
