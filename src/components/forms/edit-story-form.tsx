"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { updateStoryAction } from "@/actions/story.actions";
import type { StoryFormState } from "@/actions/story.actions";
import { PersonMultiCombobox } from "@/components/media/person-multi-combobox";
import { StoryEditorToolbar } from "@/components/story/story-editor-toolbar";
import { StoryDraftBanner } from "@/components/story/story-draft-banner";
import { useStoryDraft } from "@/components/story/use-story-draft";
import { removeDraft } from "@/components/story/story-draft-store";
import { PrivacyLevelSelect } from "./privacy-level-select";
import type { PrivacyLevel } from "@/db/schema";

const initialState: StoryFormState = {};

/**
 * The story's own full-page editor (/stories/[storySlug]/edit) — variant D
 * of the editing mock (user's pick 2026-09-27): a long text never goes in a
 * modal. One quiet pinned bar, a borderless title, and a writing column set
 * exactly like StoryArticle's reading column, so the text looks while
 * writing the way it will read. Edits autosave as a local draft on this
 * device (useStoryDraft) so a closed tab never loses them; people and
 * privacy sit below the text, out of the way. updateStoryAction redirects
 * back to the story on success.
 */
export function EditStoryForm({
  familyId,
  storyId,
  title,
  body,
  privacyLevel,
  people,
  cancelHref,
}: {
  familyId: string;
  storyId: string;
  title: string;
  body: string;
  privacyLevel: PrivacyLevel;
  people: { id: string; name: string }[];
  cancelHref: string;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const boundAction = updateStoryAction.bind(null, familyId, storyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [selectedPeople, setSelectedPeople] = useState(people);
  const draft = useStoryDraft(storyId, { title, body });

  return (
    <form
      action={formAction}
      // The submitted text is the draft's replacement; a failed save keeps
      // it in the fields, and the next keystroke writes a fresh draft.
      onSubmit={() => removeDraft(storyId)}
      className="flex flex-col"
    >
      <StoryEditorToolbar
        backHref={cancelHref}
        draftSaved={draft.draftSaved}
        notice={
          draft.leftoverDraft && (
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

        <label htmlFor="body" className="sr-only">
          {t("body")}
        </label>
        <textarea
          id="body"
          name="body"
          value={draft.body}
          onChange={(event) => draft.setBody(event.target.value)}
          placeholder={t("bodyPlaceholder")}
          required
          aria-invalid={state.fieldErrors?.body ? true : undefined}
          className="field-sizing-content min-h-[50svh] w-full max-w-[62ch] resize-none bg-transparent text-[1.0625rem] leading-[1.72] text-pretty text-foreground/90 outline-none placeholder:text-foreground/30 sm:text-lg"
        />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}

        <section
          aria-labelledby="story-details"
          className="mt-8 flex flex-col gap-5 border-t border-border pt-8"
        >
          <h2
            id="story-details"
            className="text-xs tracking-[0.12em] text-foreground/45 uppercase"
          >
            {t("details")}
          </h2>
          <PersonMultiCombobox
            familyId={familyId}
            label={t("people")}
            value={selectedPeople}
            onChange={setSelectedPeople}
          />
          {selectedPeople.map((person) => (
            <input
              key={person.id}
              type="hidden"
              name="personId"
              value={person.id}
            />
          ))}
          <PrivacyLevelSelect defaultValue={privacyLevel} />
        </section>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}
