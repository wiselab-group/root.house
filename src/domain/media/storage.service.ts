/**
 * StorageService — abstracts the object storage provider behind upload/
 * delete/getSignedUrl. Media.storageProvider (see db/schema/media.ts) is
 * stored per-row precisely so a future migration to a different provider
 * (e.g. Cloudflare R2, cheaper for large video/audio libraries) can happen
 * gradually — old rows keep their original provider, new rows use the new
 * one — without a single domain/action/UI change beyond swapping which
 * implementation getStorageService() returns.
 */
export interface UploadInput {
  /** Storage key/path — callers should namespace by familyId (see media.actions.ts). */
  key: string;
  file: Buffer | ReadableStream;
  contentType: string;
}

export interface UploadResult {
  storageKey: string;
}

export interface StorageService {
  upload(input: UploadInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, opts?: { expiresInSeconds?: number }): Promise<string>;
  /** Identifies which provider implementation this is — stored on Media.storageProvider. */
  readonly providerName: string;
}
