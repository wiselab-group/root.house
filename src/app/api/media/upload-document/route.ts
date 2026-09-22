import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate } from "@/domain/family/permissions";
import { uploadPersonDocument } from "@/domain/media/media.service";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — generous for a multi-page scanned document, still comfortably server-proxied
const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/tiff",
];

/**
 * Document upload — separate route from /api/media/upload (photos) rather
 * than a shared route branching on a `kind` field, so this route's own
 * allowlist/size ceiling (PDF, larger max) can never accidentally loosen the
 * photo route's, and vice versa. Same private-storage rationale as the photo
 * route's own doc comment (Route Handler, not Server Action, for the body-
 * size ceiling; Blob access: 'private' requires proxying through our own
 * server either way).
 *
 * Always tags exactly one Person (the profile it was uploaded from) — no
 * group-tagging, no album — see uploadPersonDocument's own doc comment.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const familyId = formData.get("familyId");
  const personId = formData.get("personId");
  const file = formData.get("file");
  const rawPrivacyLevel = formData.get("privacyLevel");
  const privacyLevel =
    rawPrivacyLevel === "private" ||
    rawPrivacyLevel === "family" ||
    rawPrivacyLevel === "public"
      ? rawPrivacyLevel
      : undefined;

  if (
    typeof familyId !== "string" ||
    typeof personId !== "string" ||
    !(file instanceof File)
  ) {
    return NextResponse.json(
      { error: "Missing familyId, personId, or file" },
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

  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const media = await uploadPersonDocument({
    familyId,
    personId,
    uploadedBy: session.user.id,
    file: buffer,
    contentType: file.type,
    originalFilename: file.name,
    privacyLevel,
  });

  return NextResponse.json({ id: media.id }, { status: 201 });
}
