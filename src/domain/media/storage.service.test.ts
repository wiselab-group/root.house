import { describe, expect, it, vi } from "vitest";
import type { StorageService } from "./storage.service";

/**
 * A fake StorageService, exercised as a mock to confirm the interface's
 * contract (upload -> storageKey; delete/getSignedUrl take that key back)
 * is what callers actually rely on — this is what lets a real
 * implementation (Vercel Blob today, potentially R2 later) be swapped in
 * without touching media.service.ts or any Server Action.
 */
function fakeStorageService(): StorageService {
  const files = new Map<string, { contentType: string }>();

  return {
    providerName: "fake",
    async upload(input) {
      files.set(input.key, { contentType: input.contentType });
      return { storageKey: input.key };
    },
    async delete(storageKey) {
      files.delete(storageKey);
    },
    async getSignedUrl(storageKey) {
      if (!files.has(storageKey)) throw new Error("not found");
      return `https://fake.storage/${storageKey}`;
    },
  };
}

describe("StorageService contract", () => {
  it("upload() returns a storageKey that getSignedUrl() can resolve", async () => {
    const storage = fakeStorageService();
    const { storageKey } = await storage.upload({
      key: "family-1/photo.jpg",
      file: Buffer.from("fake image bytes"),
      contentType: "image/jpeg",
    });

    const url = await storage.getSignedUrl(storageKey);
    expect(url).toContain(storageKey);
  });

  it("delete() removes the file so a subsequent getSignedUrl() fails", async () => {
    const storage = fakeStorageService();
    const { storageKey } = await storage.upload({
      key: "family-1/photo.jpg",
      file: Buffer.from("fake image bytes"),
      contentType: "image/jpeg",
    });

    await storage.delete(storageKey);
    await expect(storage.getSignedUrl(storageKey)).rejects.toThrow();
  });

  it("callers only depend on the interface, not the concrete implementation", async () => {
    // This is the actual point of the abstraction: media.service.ts-style
    // code can be written and tested against any StorageService.
    const storage = fakeStorageService();
    const uploadSpy = vi.spyOn(storage, "upload");

    async function uploadAndDescribe(service: StorageService): Promise<string> {
      const { storageKey } = await service.upload({
        key: "x",
        file: Buffer.from("y"),
        contentType: "image/png",
      });
      return `${service.providerName}:${storageKey}`;
    }

    const result = await uploadAndDescribe(storage);
    expect(result).toBe("fake:x");
    expect(uploadSpy).toHaveBeenCalledOnce();
  });
});
