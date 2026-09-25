import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import {
  getVisibleMedia,
  getMediaStream,
  mediaCacheControl,
  parseMediaSize,
} from "@/domain/media/media.service";

/**
 * Streams a private Media file's bytes back to the browser, after checking
 * the requester actually belongs to the owning family — this route (not a
 * direct Blob URL) is what "private by default" media actually means in
 * practice: there is no publicly guessable URL for a photo at all, every
 * fetch re-checks family membership.
 *
 * `familyId` is required as a query param rather than looked up from the
 * Media row first — this keeps the same "never resolve by id without
 * family_id in the same check" pattern as every other IDOR-safe lookup.
 *
 * `?download=1` is the only difference between "view" and "save as" — same
 * auth/visibility check, same bytes, just a Content-Disposition: attachment
 * header so the browser saves the file instead of rendering it inline. No
 * separate route or extra permission tier: downloading a photo is the same
 * capability as viewing it (canView), never a distinct "may download" role.
 * A download is always the untouched original.
 *
 * `?size=thumb|display` serves a downscaled WebP copy (see
 * domain/media/image-variants.ts); omitted, it's the original.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const familyId = searchParams.get("familyId");
  if (!familyId) {
    return NextResponse.json(
      { error: "Missing familyId query param" },
      { status: 400 },
    );
  }

  let member;
  try {
    member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  // getVisibleMedia treats "exists but PRIVATE and not owner/creator" the
  // same as "doesn't exist" — a 404 either way, no leak of which — this is
  // what stops a family member without visibility from streaming a PRIVATE
  // photo's raw bytes just by knowing its mediaId.
  const media = await getVisibleMedia(mediaId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isDownload = searchParams.get("download") === "1";
  const result = await getMediaStream(
    mediaId,
    familyId,
    isDownload ? "original" : parseMediaSize(searchParams.get("size")),
  );
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": result.contentType,
    "Cache-Control": mediaCacheControl(result.isVariant),
  };
  if (isDownload) {
    headers["Content-Disposition"] = contentDisposition(
      downloadFilename(media.title, result.contentType),
    );
  }

  return new Response(result.stream, { headers });
}

/** A human-friendly download filename — Media has no dedicated "original
 *  filename" column; a photo's title is usually null (falls back to
 *  "Фото.<ext>"), but a document's title IS its original filename
 *  (uploadPersonDocument sets it from originalFilename) and already carries
 *  its own extension — appending the content-type extension again would
 *  double it ("scan.pdf.pdf"), so skip appending when title already ends
 *  with it. */
function downloadFilename(title: string | null, contentType: string): string {
  const extension = contentType.split("/")[1]?.split("+")[0] ?? "jpg";
  const base = title?.trim() || "Фото";
  if (base.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) return base;
  return `${base}.${extension}`;
}

/**
 * A header value must be Latin-1 — a raw «Фото.jpeg» made the whole
 * download fail with a 500. RFC 6266: an ASCII fallback in `filename`,
 * the real UTF-8 name in `filename*` (which every current browser prefers).
 */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
