import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { getMedia, getMediaStream } from "@/domain/media/media.service";

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
  const familyId = new URL(request.url).searchParams.get("familyId");
  if (!familyId) {
    return NextResponse.json({ error: "Missing familyId query param" }, { status: 400 });
  }

  try {
    await requireFamilyAccess(familyId, session.user.id, "viewer");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const media = await getMedia(mediaId, familyId);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await getMediaStream(mediaId, familyId);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
