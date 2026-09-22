import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilyMapMarkers } from "@/domain/place/place-marker.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { getFamilySummary } from "@/domain/family/family.service";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { LinkButton } from "@/components/ui/link-button";
import { FamilyMapCanvasLoader } from "@/components/map/family-map-canvas-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Карта",
};

export default async function FamilyMapPage({
  params,
}: PageProps<"/families/[slug]/map">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const [markers, family] = await Promise.all([
    getFamilyMapMarkers(familyId, {
      userId: session.user.id,
      role: member.role,
    }),
    getFamilySummary(familyId),
  ]);

  const breadcrumbItems = [
    { label: "Мои семьи", href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    { label: "Карта" },
  ];

  if (markers.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <SetBreadcrumbs items={breadcrumbItems} />
        <Card>
          <CardHeader>
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin
                className="size-6"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <CardTitle className="mt-4">На карте пока пусто</CardTitle>
            <CardDescription>
              Добавьте место с точкой на карте — например, город, где кто-то из
              семьи родился, — и оно появится здесь.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={`/families/${slug}/places`}>
              Управлять местами
            </LinkButton>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-var(--header-height,64px))] w-full max-w-6xl flex-col gap-4 px-6 py-6">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Карта
        </h1>
        <p className="text-muted-foreground">
          Места, связанные с рождением, жизнью и событиями семьи.{" "}
          <LinkButton
            href={`/families/${slug}/places`}
            variant="link"
            className="h-auto p-0"
          >
            Управлять списком мест
          </LinkButton>
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <FamilyMapCanvasLoader markers={markers} familySlug={slug} />
      </div>
    </main>
  );
}
