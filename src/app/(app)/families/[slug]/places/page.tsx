import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPlaces } from "@/domain/place/place.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreatePlaceForm } from "@/components/forms/create-place-form";
import { DeletePlaceButton } from "@/components/forms/delete-place-button";
import { CollapsibleForm } from "@/components/forms/collapsible-form";

export default async function PlacesPage({ params }: PageProps<"/families/[slug]/places">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const canEdit = member.role === "owner" || member.role === "editor";
  const places = await listPlaces(familyId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium">Места</h1>
        <p className="text-muted-foreground">
          Места рождения, проживания и других событий — используются при заполнении профилей и событий.
        </p>
      </div>

      {places.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Пока пусто</CardTitle>
            <CardDescription>Добавьте первое место.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <li key={place.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{place.name}</CardTitle>
                  {(place.region || place.country) && (
                    <CardDescription>{[place.region, place.country].filter(Boolean).join(", ")}</CardDescription>
                  )}
                </CardHeader>
                {(place.description || canEdit) && (
                  <CardContent className="flex flex-col gap-2">
                    {place.description && <p className="text-sm">{place.description}</p>}
                    {canEdit && <DeletePlaceButton familyId={familyId} placeId={place.id} />}
                  </CardContent>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <CollapsibleForm triggerLabel="Добавить место">
          <CreatePlaceForm familyId={familyId} />
        </CollapsibleForm>
      )}
    </main>
  );
}
