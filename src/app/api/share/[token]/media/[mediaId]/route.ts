import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveShareLinkAccess } from "@/domain/share-link/share-link.service";
import { canViewViaShareLink } from "@/domain/share-link/public-visibility";
import { getMediaById } from "@/domain/media/media.repository";
import { getMediaStream } from "@/domain/media/media.service";

/**
 * Anonymous-side sibling of /api/media/[mediaId]/route.ts — deliberately a
 * SEPARATE route (never reused/branched into from the authenticated one),
 * same reasoning as public-tree.service.ts being its own code path rather
 * than a parameter added to tree.service.ts: no risk of the anonymous check
 * silently reusing (or, worse, replacing) the family-membership gate.
 *
 * Trusts only the URL `token` (resolved through the exact same
 * resolveShareLinkAccess used by app/share/[token]/page.tsx — so a revoked/
 * expired/password-protected-but-not-unlocked link can't stream photos
 * either, even if the mediaId is known) and re-derives `familyId` from the
 * resolved ShareLinkRecord, never from a client-supplied query param the
 * way the authenticated route does — there is no session here to have
 * already checked membership against, so the token is the only credential
 * and every other value must come from what IT resolves to.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; mediaId: string }> },
): Promise<Response> {
  const { token, mediaId } = await params;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("share_access")?.value ?? null;
  const access = await resolveShareLinkAccess(token, cookieValue);
  if (access.kind !== "granted") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const familyId = access.link.familyId;
  const media = await getMediaById(mediaId, familyId);
  if (!media || !canViewViaShareLink(media, access.link.visibilityScope)) {
    // Same "exists but not visible" -> 404 convention as the authenticated
    // route's getVisibleMedia — never distinguish "doesn't exist" from
    // "exists but not visible under this link's scope".
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
