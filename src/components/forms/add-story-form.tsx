"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createStoryAction,
  type StoryFormState,
} from "@/actions/story.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollapsibleFormClose } from "./collapsible-form";
import { PrivacyLevelSelect } from "./privacy-level-select";

const initialState: StoryFormState = {};

function SubmitButton() {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? tc("saving") : t("add")}
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
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const close = useCollapsibleFormClose();
  const boundAction = createStoryAction.bind(null, familyId, personId);
  const [state, formAction] = useActionState(boundAction, initialState);
  // Closes the form back to its trigger on success — same fix as
  // AddEventForm/AddRelativeForm: createStoryAction only revalidatePath()s
  // on success (no redirect), so without this the form stayed open with
  // stale inputs after the story was already added.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) close();
  }, [state, close]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">{t("add")}</p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          {tc("name")}
        </Label>
        <Input id="title" name="title" required />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="body" className="text-xs text-muted-foreground">
          {t("body")}
        </Label>
        <Textarea id="body" name="body" rows={5} required />
        {state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
        )}
      </div>

      <PrivacyLevelSelect />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
