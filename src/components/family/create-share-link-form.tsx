"use client";

import { useTranslations } from "next-intl";

import { useActionState, useEffect, useState } from "react";
import {
  createShareLinkAction,
  listPublicPersonsAction,
  type CreateShareLinkFormState,
} from "@/actions/share-link.actions";
import type { PublicPersonOption } from "@/domain/share-link/public-tree.service";
import type { ShareLinkVisibilityScope } from "@/domain/share-link/share-link.service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { ShareLinkAccessFields } from "./share-link-access-fields";
import { CreatedLinkResult } from "./created-link-result";

const initialState: CreateShareLinkFormState = {};

/**
 * Owner-only form to issue a new Share Link, rendered inside the EditPanel
 * opened by «Новая ссылка» (ShareLinkSection). The focus-person picker is
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
  const panel = useEditPanel();
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
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

  if (state.shareUrl)
    return <CreatedLinkResult message={t("created")} url={state.shareUrl} />;

  const noOneVisible = visiblePersons !== null && visiblePersons.length === 0;

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className="flex min-h-full flex-col gap-4"
    >
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
      <ShareLinkAccessFields passwordError={state.fieldErrors?.password} />
      {noOneVisible && (
        <p className="text-sm text-muted-foreground">
          {visibilityScope === "public_only"
            ? t("noPublicPeople")
            : t("noPeople")}
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <EditPanelFooter>
        <Button type="button" variant="ghost" onClick={panel?.requestClose}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={pending || noOneVisible}
          aria-busy={pending}
        >
          {pending ? t("creating") : t("create")}
        </Button>
      </EditPanelFooter>
    </form>
  );
}
