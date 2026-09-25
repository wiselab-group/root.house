import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate } from "@/domain/family/permissions";
import {
  isUploadKey,
  UPLOAD_RULES,
  UploadRejectedError,
  type UploadKind,
} from "@/domain/media/upload-rules";

/**
 * Issues the short-lived token a browser needs to put ONE photo or document
 * straight into private Blob storage (see lib/direct-upload.ts) — the file
 * itself never passes through our functions, so Vercel's ~4.5MB
 * request-body cap no longer limits file size.
 *
 * The same access rule as the old server-side uploads: a portrait
 * (isAvatar) needs editor, a gallery photo or a document contributor-and-up.
 * The token is bound to a pathname inside the family's own uploads folder,
 * a random suffix (no overwriting anything), and that kind's allowed types
 * and size. Recording the file is a separate call (/api/media/upload or
 * /api/media/upload-document), which re-checks all of it — this token alone
 * only lets bytes land in storage.
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

        const { familyId, kind, isAvatar } = parsePayload(clientPayload);
        const member = await requireFamilyAccess(
          familyId,
          session.user.id,
          isAvatar ? "editor" : "contributor",
        );
        if (!isAvatar && !canCreate(member.role, "media")) {
          throw new ForbiddenError("У вас нет прав на добавление медиа.");
        }
        if (!isUploadKey(pathname, familyId)) {
          throw new UploadRejectedError("Недопустимый путь файла");
        }

        return {
          allowedContentTypes: UPLOAD_RULES[kind].contentTypes,
          maximumSizeInBytes: UPLOAD_RULES[kind].maxBytes,
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
    if (error instanceof UploadRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

function parsePayload(clientPayload: string | null): {
  familyId: string;
  kind: UploadKind;
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
    const kind =
      "kind" in parsed && parsed.kind === "document" ? "document" : "photo";
    return {
      familyId: parsed.familyId,
      kind,
      // Only a photo can become a portrait.
      isAvatar:
        kind === "photo" && "isAvatar" in parsed && parsed.isAvatar === true,
    };
  }
  throw new UploadRejectedError("Не указана семья");
}
