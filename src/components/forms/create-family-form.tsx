"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
  return (
    <Button
      type="submit"
      className="flex-1"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Создаём…" : "Создать семью"}
    </Button>
  );
}

export function CreateFamilyForm() {
  const [state, formAction] = useActionState(createFamilyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Название семьи</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Например, Ивановы"
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Описание (необязательно)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Пара слов об архиве"
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
          Отмена
        </Link>
      </div>
    </form>
  );
}
