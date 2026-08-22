import { z } from "zod";

export const createStorySchema = z.object({
  title: z.string().trim().min(1, "Введите название истории").max(200),
  body: z.string().trim().min(1, "Расскажите историю").max(20000),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
