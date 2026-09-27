"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { PlusIcon } from "lucide-react";
import { createDraftStoryAction } from "@/actions/story.actions";
import { Button } from "@/components/ui/button";
import {
  SECTION_ACTION_CLASS,
  SECTION_ACTION_ICON_CLASS,
} from "@/components/person/profile-section-with-add";

function SubmitContent({ variant }: { variant: "section" | "primary" }) {
  const t = useTranslations("stories");
  const tc = useTranslations("common");
  const { pending } = useFormStatus();
  const icon =
    variant === "section" ? (
      <PlusIcon
        className={`${SECTION_ACTION_ICON_CLASS} transition-transform group-hover:rotate-90`}
        aria-hidden="true"
      />
    ) : (
      <PlusIcon aria-hidden="true" />
    );
  if (pending) {
    return (
      <>
        {icon}
        {t("opening")}
      </>
    );
  }
  return variant === "section" ? (
    <>
      {icon}
      <span className="sm:hidden">{tc("add")}</span>
      <span className="max-sm:hidden">{t("add")}</span>
    </>
  ) : (
    <>
      {icon}
      {t("add")}
    </>
  );
}

function SubmitButton({ variant }: { variant: "section" | "primary" }) {
  const { pending } = useFormStatus();
  return variant === "section" ? (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${SECTION_ACTION_CLASS} text-primary hover:text-primary/80 disabled:opacity-60`}
    >
      <SubmitContent variant={variant} />
    </button>
  ) : (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      <SubmitContent variant={variant} />
    </Button>
  );
}

/**
 * «Новая история» — creates the author's draft (createDraftStoryAction)
 * and opens the full-page editor on it, instead of an inline form: a
 * story is long text, written where it's autosaved from the first
 * keystroke (user's pick 2026-09-27). `personId` links the new story to
 * the profile it was started from. `section` matches the «Добавить …»
 * actions on profile section headings; `primary` is a regular button.
 */
export function NewStoryButton({
  familyId,
  personId,
  variant = "primary",
}: {
  familyId: string;
  personId?: string;
  variant?: "section" | "primary";
}) {
  return (
    <form action={createDraftStoryAction.bind(null, familyId)}>
      {personId && <input type="hidden" name="personId" value={personId} />}
      <SubmitButton variant={variant} />
    </form>
  );
}
