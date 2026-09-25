import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate } from "@/domain/family/permissions";
import {
  isPhotoUploadKey,
  PHOTO_CONTENT_TYPES,
  PHOTO_MAX_BYTES,
  PhotoUploadRejectedError,
} from "@/domain/media/photo-upload-rules";

/**
 * Issues the short-lived token a browser needs to put ONE photo straight
 * into private Blob storage (see lib/upload-photo.ts) — the file itself
 * never passes through our functions, so Vercel's ~4.5MB request-body cap
 * no longer limits photo size.
 *
 * The same access rule as the old server-side upload: a portrait
 * (isAvatar) needs editor, a gallery photo contributor-and-up. The token is
 * bound to a pathname inside the family's own uploads folder, a random
 * suffix (no overwriting anything), the allowed types and 25MB. Recording
 * the photo is a separate call to /api/media/upload, which re-checks all of
 * it — this token alone only lets bytes land in storage.
 *
 * No onUploadCompleted: Blob's completion callback can't reach localhost,
 * and the browser's own finalize call already covers it.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user) throw new ForbiddenError("Unauthorized");

        const { familyId, isAvatar } = parsePayload(clientPayload);
        const member = await requireFamilyAccess(
          familyId,
          session.user.id,
          isAvatar ? "editor" : "contributor",
        );
        if (!isAvatar && !canCreate(member.role, "media")) {
          throw new ForbiddenError("У вас нет прав на добавление медиа.");
        }
        if (!isPhotoUploadKey(pathname, familyId)) {
          throw new PhotoUploadRejectedError("Недопустимый путь файла");
        }

        return {
          allowedContentTypes: PHOTO_CONTENT_TYPES,
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof PhotoUploadRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

function parsePayload(clientPayload: string | null): {
  familyId: string;
  isAvatar: boolean;
} {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(clientPayload ?? "null");
  } catch {
    // Falls through to the rejection below.
  }
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "familyId" in parsed &&
    typeof parsed.familyId === "string"
  ) {
    return {
      familyId: parsed.familyId,
      isAvatar: "isAvatar" in parsed && parsed.isAvatar === true,
    };
  }
  throw new PhotoUploadRejectedError("Не указана семья");
}
