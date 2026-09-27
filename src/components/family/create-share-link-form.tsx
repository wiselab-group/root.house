"use client";

import { useTranslations } from "next-intl";

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
import { PasswordInput } from "@/components/ui/password-input";

const initialState: CreateShareLinkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("shareLinks");
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? t("creating") : t("create")}
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
  const t = useTranslations("shareLinks");
  const tc = useTranslations("common");
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
        <p className="text-sm text-muted-foreground">{t("created")}</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={state.shareUrl} className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? tc("copied") : tc("copy")}
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
            {t("scope")}
          </Label>
          <NativeSelect
            id="share-visibility-scope"
            name="visibilityScope"
            value={visibilityScope}
            onChange={(e) =>
              setVisibilityScope(e.target.value as ShareLinkVisibilityScope)
            }
          >
            <option value="family_and_public">{t("scopeFamily")}</option>
            <option value="public_only">{t("scopePublic")}</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">{t("privateHidden")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-focus-person"
            className="text-xs text-muted-foreground"
          >
            {t("focus")}
          </Label>
          <NativeSelect
            id="share-focus-person"
            name="focusPersonId"
            required
            disabled={!visiblePersons || noOneVisible}
          >
            {visiblePersons?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || tc("unnamed")}
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
            {t("expiration")}
          </Label>
          <NativeSelect
            id="share-expiration"
            name="expirationPreset"
            defaultValue="7d"
          >
            <option value="never">{t("never")}</option>
            <option value="7d">{t("days", { count: 7 })}</option>
            <option value="30d">{t("days", { count: 30 })}</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="share-password"
            className="text-xs text-muted-foreground"
          >
            {t("password")}
          </Label>
          <PasswordInput id="share-password" name="password" />
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
            ? t("noPublicPeople")
            : t("noPeople")}
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
