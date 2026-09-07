import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilyGallery } from "@/domain/media/media.service";
import { listAlbums } from "@/domain/album/album.service";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { PhotosPageLayout } from "@/components/media/photos-page-layout";

export const metadata: Metadata = {
  title: "Фото",
};

export default async function PhotosPage({
  params,
}: PageProps<"/families/[slug]/photos">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const canEdit = member.role === "owner" || member.role === "editor";

  const [photos, albums, family] = await Promise.all([
    getFamilyGallery(familyId),
    listAlbums(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <PhotosPageLayout
      familyId={familyId}
      familySlug={slug}
      familyName={family?.name ?? slug}
      canEdit={canEdit}
      albums={albums}
      activeAlbumId={null}
      activeAlbumName={null}
      photos={photos}
    />
  );
}
