"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateStoryAction } from "@/actions/story.actions";
import type { StoryFormState } from "@/actions/story.actions";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PersonMultiCombobox } from "@/components/media/person-multi-combobox";
import { PrivacyLevelSelect } from "./privacy-level-select";
import type { PrivacyLevel } from "@/db/schema";

const initialState: StoryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * Edit form for a story's own /stories/[storySlug]/edit page — same field
 * set/shape as AddStoryFullForm, prefilled with the story's current values,
 * calling updateStoryAction (which redirects back to the story's detail
 * page on success) instead of the create action.
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
  const boundAction = updateStoryAction.bind(null, familyId, storyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [selectedPeople, setSelectedPeople] = useState(people);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          Название
        </Label>
        <Input id="title" name="title" defaultValue={title} required />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body" className="text-xs text-muted-foreground">
          История
        </Label>
        <Textarea id="body" name="body" rows={8} defaultValue={body} required />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}
      </div>

      <PersonMultiCombobox
        familyId={familyId}
        label="Кто в этой истории?"
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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <LinkButton href={cancelHref} variant="ghost">
          Отмена
        </LinkButton>
      </div>
    </form>
  );
}
