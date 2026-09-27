import { z } from "zod";
import { privacyLevelSchema } from "./event";

export const createStorySchema = z.object({
  title: z.string().trim().min(1, "storyTitleRequired").max(200),
  body: z.string().trim().min(1, "storyBodyRequired").max(20000),
  privacyLevel: privacyLevelSchema.default("family"),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;

/** Autosave of work in progress — only the length limits: an unfinished
 *  draft may well have no title or no text yet. */
export const storyDraftContentSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(20000),
});
