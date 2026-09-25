import { after, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate } from "@/domain/family/permissions";
import {
  uploadPersonPhoto,
  uploadPersonAvatar,
  removeMediaIfUnlinked,
  makePhotoVariants,
} from "@/domain/media/media.service";
import { UploadRejectedError } from "@/domain/media/upload-rules";
import { getPerson, setPersonAvatar } from "@/domain/person/person.service";

// The downscaled copies are made in after() — past the response, but still
// within this function's time budget: reading the original back, decoding
// (HEIC through WASM takes ~1–3s for a 12MP iPhone photo) and storing two
// copies — see image-variants.ts.
export const maxDuration = 60;

interface FinalizeBody {
  familyId?: unknown;
  storageKey?: unknown;
  personId?: unknown;
  personIds?: unknown;
  albumIds?: unknown;
  isAvatar?: unknown;
  privacyLevel?: unknown;
}

/**
 * Records a photo the browser has already put into private Blob storage
 * (lib/upload-photo.ts, with a token from /api/media/upload-token) — a small
 * JSON call, the file itself never passes through here. uploadPersonPhoto
 * re-checks everything about the stored file itself (folder, privacy, type,
 * size); this route checks who is asking.
 *
 * A Route Handler rather than a Server Action because the browser calls it
 * right after its own direct upload, alongside the token route.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as FinalizeBody;
  const { familyId, storageKey, personId } = body;
  // A gallery photo may tag zero, one, or several people and belong to
  // zero, one, or several albums; a portrait is always exactly one person.
  const personIds = stringList(body.personIds);
  const albumIds = stringList(body.albumIds);
  const isAvatar = body.isAvatar === true;
  const privacyLevel =
    body.privacyLevel === "private" ||
    body.privacyLevel === "family" ||
    body.privacyLevel === "public"
      ? body.privacyLevel
      : undefined;

  if (typeof familyId !== "string" || typeof storageKey !== "string") {
    return NextResponse.json(
      { error: "Missing familyId or storageKey" },
      { status: 400 },
    );
  }
  if (isAvatar && typeof personId !== "string") {
    return NextResponse.json(
      { error: "Missing personId for avatar upload" },
      { status: 400 },
    );
  }

  // Avatar assignment is a Person-profile concern (editor-only, same as
  // editing the Person itself); an ordinary gallery upload is open to
  // contributor-and-up (see domain/family/permissions.ts::canCreate).
  try {
    const member = await requireFamilyAccess(
      familyId,
      session.user.id,
      isAvatar ? "editor" : "contributor",
    );
    if (!isAvatar && !canCreate(member.role, "media")) {
      return NextResponse.json(
        { error: "У вас нет прав на добавление медиа." },
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
    if (isAvatar) {
      const avatarPersonId = personId as string;

      // Replacing an existing avatar: record+assign the new one first, then
      // deal with the old one — never leave the person without any avatar
      // between the two steps if something below fails.
      const previousPerson = await getPerson(avatarPersonId, familyId);
      const previousAvatarMediaId = previousPerson?.photoMediaId ?? null;

      const avatarMedia = await uploadPersonAvatar({
        personId: avatarPersonId,
        familyId,
        uploadedBy: session.user.id,
        storageKey,
      });
      await setPersonAvatar(avatarPersonId, familyId, avatarMedia.id);
      after(() => makePhotoVariants(avatarMedia.id, familyId));

      // The old portrait normally stays in the gallery (portraits are
      // gallery photos now); only a pre-gallery avatar nothing uses is removed.
      if (previousAvatarMediaId) {
        await removeMediaIfUnlinked(
          previousAvatarMediaId,
          familyId,
          session.user.id,
        );
      }

      return NextResponse.json({ id: avatarMedia.id }, { status: 201 });
    }

    const media = await uploadPersonPhoto({
      familyId,
      personIds,
      albumIds,
      uploadedBy: session.user.id,
      storageKey,
      privacyLevel,
    });
    after(() => makePhotoVariants(media.id, familyId));
    return NextResponse.json({ id: media.id }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
