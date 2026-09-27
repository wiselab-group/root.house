"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  createFamilyAction,
  type CreateFamilyFormState,
} from "@/actions/family.actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateFamilyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("families");
  return (
    <Button
      type="submit"
      className="flex-1"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? t("creating") : t("create")}
    </Button>
  );
}

export function CreateFamilyForm() {
  const t = useTranslations("families");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(createFamilyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={t("namePlaceholder")}
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t("descriptionPlaceholder")}
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.description}
          </p>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <SubmitButton />
        <Link
          href="/families"
          className={buttonVariants({ variant: "outline" })}
        >
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
