import { put, del, get, head } from "@vercel/blob";
import type {
  StorageService,
  UploadInput,
  UploadResult,
} from "./storage.service";

/**
 * Vercel Blob implementation of StorageService — chosen for the MVP (see
 * docs/architecture.md) for zero infrastructure config and a built-in
 * direct-upload flow. Blobs are stored with access: 'private', which
 * requires the read-write token to fetch — the actual per-user
 * authorization check still happens at our own application layer (the
 * media route handler calls requireFamilyAccess before ever touching
 * storage), Blob's 'private' access is defense-in-depth on top of that,
 * not a replacement for it.
 */
class VercelBlobStorageService implements StorageService {
  readonly providerName = "vercel_blob";

  async upload(input: UploadInput): Promise<UploadResult> {
    const result = await put(input.key, input.file, {
      access: "private",
      contentType: input.contentType,
      addRandomSuffix: false,
    });
    // Vercel Blob's own pathname becomes our storageKey — getStream/delete
    // use it (not the CDN url, which isn't stable/guaranteed private) to
    // fetch the blob back later.
    return { storageKey: result.pathname };
  }

  async delete(storageKey: string): Promise<void> {
    // del() has no access-mode option — deletion is authorized purely by the
    // read-write token (server-side only), not a per-call access parameter.
    await del(storageKey);
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    // Not a signed URL in the "presigned S3 URL" sense — private Blob access
    // is checked server-side per request. Callers route through our own
    // /api/media/[id] handler (see actions/media.actions.ts), which is what
    // actually performs the requireFamilyAccess check before ever calling
    // this. This method exists so a future provider that DOES support real
    // presigned URLs can implement it meaningfully without an interface change.
    void storageKey;
    throw new Error(
      "VercelBlobStorageService does not issue direct signed URLs — fetch media through /api/media/[id] instead.",
    );
  }

  /**
   * Size/type of a stored blob, and whether it really is private — a
   * browser upload picks its own access mode, so the finalize step checks
   * it instead of trusting the client (a private blob's URL is on the
   * store's `.private.` host).
   */
  async getInfo(storageKey: string): Promise<{
    sizeBytes: number;
    contentType: string;
    isPrivate: boolean;
  } | null> {
    try {
      const info = await head(storageKey);
      return {
        sizeBytes: info.size,
        contentType: info.contentType,
        isPrivate: new URL(info.url).hostname.includes(".private."),
      };
    } catch {
      return null;
    }
  }

  /** The whole blob in memory — for making a photo's variants. */
  async readBuffer(storageKey: string): Promise<Buffer> {
    const { stream } = await this.getStream(storageKey);
    return Buffer.from(await new Response(stream).arrayBuffer());
  }

  /** Used by the media route handler to stream a private blob's bytes back to an authorized request. */
  async getStream(storageKey: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentType: string | null;
  }> {
    const result = await get(storageKey, { access: "private" });
    if (!result || !result.stream) {
      throw new Error(`Blob not found: ${storageKey}`);
    }
    return { stream: result.stream, contentType: result.blob.contentType };
  }
}

export const vercelBlobStorageService = new VercelBlobStorageService();
