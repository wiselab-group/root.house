import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate } from "@/domain/family/permissions";
import { uploadPersonDocument } from "@/domain/media/media.service";
import { UploadRejectedError } from "@/domain/media/upload-rules";

interface FinalizeBody {
  familyId?: unknown;
  personId?: unknown;
  storageKey?: unknown;
  filename?: unknown;
  privacyLevel?: unknown;
}

/**
 * Records a document the browser has already put into private Blob storage
 * (lib/upload-document.ts) — a small JSON call, the file never passes
 * through here. A separate route from /api/media/upload (photos) rather
 * than one branching on a `kind` field, so neither can accidentally loosen
 * the other's checks. uploadPersonDocument re-checks the stored file itself
 * (folder, privacy, type, 25MB); this route checks who is asking.
 *
 * Always tags exactly one Person (the profile it was uploaded from) — no
 * group-tagging, no album — see uploadPersonDocument's own doc comment.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as FinalizeBody;
  const { familyId, personId, storageKey, filename } = body;
  const privacyLevel =
    body.privacyLevel === "private" ||
    body.privacyLevel === "family" ||
    body.privacyLevel === "public"
      ? body.privacyLevel
      : undefined;

  if (
    typeof familyId !== "string" ||
    typeof personId !== "string" ||
    typeof storageKey !== "string" ||
    typeof filename !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing familyId, personId, storageKey, or filename" },
      { status: 400 },
    );
  }

  try {
    const member = await requireFamilyAccess(
      familyId,
      session.user.id,
      "contributor",
    );
    if (!canCreate(member.role, "media")) {
      return NextResponse.json(
        { error: "У вас нет прав на добавление документов." },
        { status: 403 },
      );
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    const media = await uploadPersonDocument({
      familyId,
      personId,
      uploadedBy: session.user.id,
      storageKey,
      filename,
      privacyLevel,
    });
    return NextResponse.json({ id: media.id }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
