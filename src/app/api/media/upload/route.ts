import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import {
  uploadPersonPhoto,
  uploadPersonAvatar,
  removeMedia,
} from "@/domain/media/media.service";
import { getPerson, setPersonAvatar } from "@/domain/person/person.service";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — generous for a phone photo, small enough to pass through our server comfortably
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/**
 * Photo upload goes through our own server (not a direct browser->Blob
 * upload via Vercel's client-token flow) specifically so we can store it
 * with access: 'private' — Vercel Blob's client-token uploads only support
 * public blobs (no `access` option in GenerateClientTokenOptions), which
 * would conflict with the "private/family by default, never public" rule.
 * A Route Handler (not a Server Action) is used because Server Actions have
 * a small default body-size ceiling not meant for file uploads.
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
  const isAvatar = formData.get("isAvatar") === "true";

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
    await requireFamilyAccess(familyId, session.user.id, "editor");
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
      { error: "File too large (max 10MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isAvatar) {
    // Replacing an existing avatar: upload+assign the new one first, then
    // remove the old Media row — never leave the person without any avatar
    // between the two steps if something below fails.
    const previousPerson = await getPerson(personId, familyId);
    const previousAvatarMediaId = previousPerson?.photoMediaId ?? null;

    const avatarMedia = await uploadPersonAvatar({
      familyId,
      personId,
      uploadedBy: session.user.id,
      file: buffer,
      contentType: file.type,
      originalFilename: file.name,
    });
    await setPersonAvatar(personId, familyId, avatarMedia.id);

    if (previousAvatarMediaId) {
      await removeMedia(previousAvatarMediaId, familyId);
    }

    return NextResponse.json({ id: avatarMedia.id }, { status: 201 });
  }

  const media = await uploadPersonPhoto({
    familyId,
    personId,
    uploadedBy: session.user.id,
    file: buffer,
    contentType: file.type,
    originalFilename: file.name,
  });

  return NextResponse.json({ id: media.id }, { status: 201 });
}
