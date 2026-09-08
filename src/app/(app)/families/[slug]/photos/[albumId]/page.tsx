import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getAlbumGallery,
  filterVisibleGalleryPhotos,
} from "@/domain/media/media.service";
import { getAlbum, listAlbumsWithCover } from "@/domain/album/album.service";
import { getFamilySummary } from "@/domain/family/family.service";
import { canCreate } from "@/domain/family/permissions";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { PhotosPageLayout } from "@/components/media/photos-page-layout";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/photos/[albumId]">): Promise<Metadata> {
  const { slug, albumId } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const album = await getAlbum(albumId, familyId);
  if (!album) notFound();
  return { title: album.name };
}

export default async function AlbumPage({
  params,
}: PageProps<"/families/[slug]/photos/[albumId]">) {
  const { slug, albumId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const canEdit = member.role === "owner" || member.role === "editor";
  const canUpload = canCreate(member.role, "media");

  // getAlbum is IDOR-safe (WHERE id AND family_id in one query) — a
  // guessed/foreign albumId 404s the same way a foreign person slug does.
  const album = await getAlbum(albumId, familyId);
  if (!album) notFound();

  const [allPhotos, albums, family] = await Promise.all([
    getAlbumGallery(albumId, familyId),
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
      activeAlbumId={albumId}
      activeAlbumName={album.name}
      activeAlbumDescription={album.description}
      photos={photos}
    />
  );
}
