"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createStoryFromStoriesPageAction } from "@/actions/story.actions";
import type { StoryFormState } from "@/actions/story.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PersonMultiCombobox } from "@/components/media/person-multi-combobox";
import { PrivacyLevelSelect } from "./privacy-level-select";
import { useCollapsibleFormClose } from "./collapsible-form";

const initialState: StoryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Добавить историю"}
    </Button>
  );
}

/**
 * Full "add a story" form for the family-wide /stories page — unlike
 * AddStoryForm (bound to one Person's profile), this lets the author link
 * any number of people via PersonMultiCombobox (already generic despite
 * living under components/media — see its own doc comment). Redirects to
 * the new story's own page on success (createStoryFromStoriesPageAction),
 * so there's no "closes back to trigger" success handling needed here the
 * way AddStoryForm has — a redirect already leaves this form behind.
 */
export function AddStoryFullForm({ familyId }: { familyId: string }) {
  const close = useCollapsibleFormClose();
  const boundAction = createStoryFromStoriesPageAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <p className="text-sm font-medium">Новая история</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          Название
        </Label>
        <Input id="title" name="title" required />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body" className="text-xs text-muted-foreground">
          История
        </Label>
        <Textarea id="body" name="body" rows={8} required />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}
      </div>

      <PersonMultiCombobox
        familyId={familyId}
        label="Кто в этой истории?"
        value={people}
        onChange={setPeople}
      />
      {people.map((person) => (
        <input
          key={person.id}
          type="hidden"
          name="personId"
          value={person.id}
        />
      ))}

      <PrivacyLevelSelect />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
