"use client";

import { startTransition, type FormEvent } from "react";

/**
 * An `onSubmit` handler that runs a useActionState action WITHOUT React's
 * automatic form reset. A `<form action={…}>` resets every uncontrolled
 * field after each submit — so when the server answers with a validation
 * error, whatever the user typed snaps back to the old values, and a second
 * «Сохранить» silently saves those (caught on the «Свадьба» panel,
 * 2026-09-27). Submitting through onSubmit keeps the fields as typed.
 *
 * `useFormStatus` doesn't see this submission — take `pending` from
 * useActionState's third value instead.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
