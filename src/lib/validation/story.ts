import { z } from "zod";
import { privacyLevelSchema } from "./event";

export const createStorySchema = z.object({
  title: z.string().trim().min(1, "Введите название истории").max(200),
  body: z.string().trim().min(1, "Расскажите историю").max(20000),
  privacyLevel: privacyLevelSchema.default("family"),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
