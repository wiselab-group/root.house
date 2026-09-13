"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createShareLinkAction,
  listPublicPersonsAction,
  type CreateShareLinkFormState,
} from "@/actions/share-link.actions";
import type { PublicPersonOption } from "@/domain/share-link/public-tree.service";
import type { ShareLinkVisibilityScope } from "@/domain/share-link/share-link.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const initialState: CreateShareLinkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Создаём…" : "Создать ссылку"}
    </Button>
  );
}

/**
 * Owner-only form to issue a new Share Link. The focus-person picker is
 * deliberately NOT the tree's own PersonCombobox (that always self-fetches
 * via the auth-gated, unfiltered searchPeopleForTraceAction) — instead a
 * plain <select> backed by listPublicPersonsAction, re-fetched whenever
 * visibilityScope changes so it only ever offers people who'd actually be
 * visible under the link about to be created.
 *
 * visibilityScope itself defaults to "family_and_public" — requiring every
 * Person to be hand-marked "public" first (the narrower "public_only" scope)
 * would be impractical for a family with hundreds of people, virtually all
 * left at the "family" default privacyLevel (see
 * db/schema/share-link.ts::shareLinkVisibilityScopeEnum's doc comment).
 * "private" objects are excluded either way, unconditionally.
 */
export function CreateShareLinkForm({ familyId }: { familyId: string }) {
  const boundAction = createShareLinkAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);
  const [visibilityScope, setVisibilityScope] =
    useState<ShareLinkVisibilityScope>("family_and_public");
  const [visiblePersons, setVisiblePersons] = useState<
    PublicPersonOption[] | null
  >(null);

  useEffect(() => {
    // Guards against a stale response from a previous visibilityScope
    // landing after a newer request already started (e.g. the owner
    // flips the select twice in quick succession) — only the effect run
    // whose own scope still matches the latest one is allowed to commit.
    let cancelled = false;
    listPublicPersonsAction(familyId, visibilityScope).then((persons) => {
      if (!cancelled) setVisiblePersons(persons);
    });
    return () => {
      cancelled = true;
    };
  }, [familyId, visibilityScope]);

  async function copyLink() {
    if (!state.shareUrl) return;
    await navigator.clipboard.writeText(state.shareUrl);
    setCopied(true);
  }

  if (state.shareUrl) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-sm text-muted-foreground">
          Ссылка создана. Сохраните её сейчас — показать её снова будет нельзя,
          только отозвать и создать новую.
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly value={state.shareUrl} className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Скопировано" : "Копировать"}
          </Button>
        </div>
      </div>
    );
  }

  const noOneVisible = visiblePersons !== null && visiblePersons.length === 0;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-visibility-scope"
            className="text-xs text-muted-foreground"
          >
            Что видно по ссылке
          </Label>
          <NativeSelect
            id="share-visibility-scope"
            name="visibilityScope"
            value={visibilityScope}
            onChange={(e) =>
              setVisibilityScope(e.target.value as ShareLinkVisibilityScope)
            }
          >
            <option value="family_and_public">
              Всё, что видно участникам семьи
            </option>
            <option value="public_only">Только отмеченное «публичным»</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            Приватные данные не показываются в любом случае.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-focus-person"
            className="text-xs text-muted-foreground"
          >
            Фокус дерева
          </Label>
          <NativeSelect
            id="share-focus-person"
            name="focusPersonId"
            required
            disabled={!visiblePersons || noOneVisible}
          >
            {visiblePersons?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          {state.fieldErrors?.focusPersonId && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.focusPersonId}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-expiration"
            className="text-xs text-muted-foreground"
          >
            Срок действия
          </Label>
          <NativeSelect
            id="share-expiration"
            name="expirationPreset"
            defaultValue="7d"
          >
            <option value="never">Никогда</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-password"
            className="text-xs text-muted-foreground"
          >
            Пароль (необязательно)
          </Label>
          <Input id="share-password" name="password" type="password" />
          {state.fieldErrors?.password && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.password}
            </p>
          )}
        </div>
      </div>
      <SubmitButton />
      {noOneVisible && (
        <p className="text-sm text-muted-foreground">
          {visibilityScope === "public_only"
            ? "Ни один человек не отмечен «публичным» — отметьте хотя бы одного в его профиле, или выберите «Всё, что видно участникам семьи»."
            : "В семье пока нет ни одного человека."}
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
