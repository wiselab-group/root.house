import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getFamilyGallery,
  filterVisibleGalleryPhotos,
} from "@/domain/media/media.service";
import { listAlbumsWithCover } from "@/domain/album/album.service";
import { getFamilySummary } from "@/domain/family/family.service";
import { canCreate } from "@/domain/family/permissions";
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
  const canUpload = canCreate(member.role, "media");

  const [allPhotos, albums, family] = await Promise.all([
    getFamilyGallery(familyId),
    listAlbumsWithCover(familyId),
    getFamilySummary(familyId),
  ]);
  const photos = filterVisibleGalleryPhotos(allPhotos, {
    userId: session.user.id,
    role: member.role,
  });

  return (
    <PhotosPageLayout
      familyId={familyId}
      familySlug={slug}
      familyName={family?.name ?? slug}
      canEdit={canEdit}
      canUpload={canUpload}
      albums={albums}
      activeAlbumId={null}
      activeAlbumName={null}
      activeAlbumDescription={null}
      photos={photos}
    />
  );
}
