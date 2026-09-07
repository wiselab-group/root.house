import { z } from "zod";

export const createAlbumSchema = z.object({
  name: z.string().trim().min(1, "Введите название альбома").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
