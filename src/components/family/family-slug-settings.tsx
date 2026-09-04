"use client";

import {
  useActionState,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import {
  updateFamilySlugAction,
  type UpdateFamilySlugFormState,
} from "@/actions/family.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyRole } from "@/domain/family/roles";

const initialState: UpdateFamilySlugFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/** Editable form half — mounted only while editing. On success the action
 *  itself redirects to /families/[newSlug], so there's no "saved" state to
 *  come back here: either a validation error is shown, or the browser
 *  navigates away and this component unmounts with it. */
function SlugEditForm({
  familyId,
  slug,
  onCancel,
}: {
  familyId: string;
  slug: string;
  onCancel: () => void;
}) {
  const boundAction = updateFamilySlugAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="slug" className="text-xs text-muted-foreground">
        Короткая ссылка на семью
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">/families/</span>
        <Input
          id="slug"
          name="slug"
          defaultValue={slug}
          className="max-w-48"
          required
        />
        <SaveButton />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
      {state.fieldErrors?.slug && (
        <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

/** Short shareable URL for a family (/families/[slug]) — visible to
 *  everyone, editable only by the owner (changing it breaks anyone else's
 *  bookmarked link, so it's a deliberately higher-privilege action than
 *  editing people). */
export function FamilySlugSettings({
  familyId,
  slug,
  role,
}: {
  familyId: string;
  slug: string;
  role: FamilyRole;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  // `window.location.origin` doesn't exist during SSR — useSyncExternalStore
  // is the React-sanctioned way to read a client-only value: it forces the
  // very first client render to reuse the server snapshot ("") before
  // committing, so hydration never sees a mismatch (unlike reading
  // `window` directly in the render body, or setState-in-a-mount-effect).
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const shortUrl = `${origin}/families/${slug}`;

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
  }

  if (role === "owner" && editing) {
    return (
      <SlugEditForm
        familyId={familyId}
        slug={slug}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span className="font-mono">{shortUrl}</span>
      <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? "Скопировано" : "Копировать"}
      </Button>
      {role === "owner" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Изменить
        </Button>
      )}
    </div>
  );
}
