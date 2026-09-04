"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createStoryAction,
  type StoryFormState,
} from "@/actions/story.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: StoryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Добавить историю"}
    </Button>
  );
}

export function AddStoryForm({
  familyId,
  personId,
}: {
  familyId: string;
  personId: string;
}) {
  const boundAction = createStoryAction.bind(null, familyId, personId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">Добавить историю</p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          Название
        </Label>
        <Input id="title" name="title" required />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="body" className="text-xs text-muted-foreground">
          История
        </Label>
        <textarea
          id="body"
          name="body"
          rows={5}
          required
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
