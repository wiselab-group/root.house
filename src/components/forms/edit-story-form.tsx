"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateStoryAction } from "@/actions/story.actions";
import type { StoryFormState, StoryPhotoChoice } from "@/actions/story.actions";
import { StoryDetailsSection } from "@/components/story/story-details-section";
import { StoryEditorToolbar } from "@/components/story/story-editor-toolbar";
import { StoryDraftBanner } from "@/components/story/story-draft-banner";
import { useStoryAutosave } from "@/components/story/use-story-autosave";
import { StoryEditor } from "@/components/story/editor/story-editor";
import type { MentionPerson } from "@/components/story/editor/use-mention-suggestion";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import type { PrivacyLevel } from "@/db/schema";

const initialState: StoryFormState = {};

/**
 * The story's own full-page editor (/stories/[storySlug]/edit) — variant D
 * of the editing mock (user's pick 2026-09-27): a long text never goes in a
 * modal. One quiet pinned bar, a borderless title, and a rich-text writing
 * column (StoryEditor) set exactly like StoryArticle's reading column, so
 * the text looks while writing the way it will read. Title and text autosave to the server
 * (useStoryAutosave), so a closed tab or another device never loses them;
 * people, privacy and the hero carousel's photos sit below the text, out
 * of the way and are saved with the submit. A draft story (status `draft`, only its author sees it)
 * submits as «Опубликовать»; a published one as «Сохранить».
 * updateStoryAction redirects to the story on success.
 */
export function EditStoryForm({
  familyId,
  storyId,
  title,
  body,
  privacyLevel,
  people,
  mentionPeople,
  photos,
  isDraft,
  serverDraft,
  cancelHref,
}: {
  familyId: string;
  storyId: string;
  title: string;
  body: string;
  privacyLevel: PrivacyLevel;
  people: { id: string; name: string }[];
  /** The whole family, for «@» mentions in the text. */
  mentionPeople: MentionPerson[];
  /** The hero carousel's photos, in order — see StoryPhotosField. */
  photos: StoryPhotoChoice[];
  isDraft: boolean;
  /** This user's autosaved edits to a published story from an earlier
   *  visit — see useStoryAutosave. */
  serverDraft: { title: string; body: string } | null;
  cancelHref: string;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const boundAction = updateStoryAction.bind(null, familyId, storyId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const draft = useStoryAutosave({
    familyId,
    storyId,
    saved: { title, body },
    serverDraft,
  });

  return (
    <form
      // A queued autosave must not land after the real save (it would
      // re-create the draft the save just cleared).
      onSubmit={(event) => {
        draft.cancelPending();
        submitWithoutReset(formAction)(event);
      }}
      className="flex flex-col"
    >
      <StoryEditorToolbar
        backHref={cancelHref}
        isDraft={isDraft}
        status={draft.status}
        pending={pending}
        notice={
          draft.offeredDraft && (
            <StoryDraftBanner
              onRestore={draft.restore}
              onDiscard={draft.discard}
            />
          )
        }
      />

      <div className="mx-auto flex w-full max-w-176 flex-col gap-6 px-4 pt-10 pb-24 sm:px-8 sm:pt-14">
        <label htmlFor="title" className="sr-only">
          {tc("name")}
        </label>
        <input
          id="title"
          name="title"
          value={draft.title}
          onChange={(event) => draft.setTitle(event.target.value)}
          placeholder={t("titlePlaceholder")}
          required
          aria-invalid={state.fieldErrors?.title ? true : undefined}
          className="w-full border-b border-transparent bg-transparent pb-2 font-heading text-display leading-[1.08] font-normal tracking-tight text-balance transition-colors duration-base ease-(--ease-reveal) outline-none placeholder:text-foreground/30 focus-visible:border-border aria-invalid:border-destructive"
        />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}

        <input type="hidden" name="body" value={draft.body} />
        <StoryEditor
          familyId={familyId}
          value={draft.body}
          onChange={draft.setBody}
          people={mentionPeople}
          invalid={Boolean(state.fieldErrors?.body)}
        />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}

        <StoryDetailsSection
          familyId={familyId}
          people={people}
          photos={photos}
          privacyLevel={privacyLevel}
        />

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}
