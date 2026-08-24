"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { PencilIcon } from "lucide-react";
import { loginAction, type LoginFormState } from "@/actions/auth.actions";
import { credentialsSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Same email format the server actually enforces — checked here only to
 *  decide whether the password step can be reached, never as the source of
 *  truth (loginAction re-validates with the same schema regardless). */
const isValidEmail = (value: string) => credentialsSchema.shape.email.safeParse(value).success;

const initialState: LoginFormState = {};

/** Single styling for every inline field/form error in this form, so a
 *  client-side message (invalid email format) and the server's own error
 *  (wrong credentials) always render identically. */
function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? "Входим…" : children}
    </Button>
  );
}

/**
 * Identifier-first login — email and password aren't shown together. Step 1
 * collects just the email (Enter or "Продолжить" advances); step 2 swaps in
 * the password field, autofocused, with the email shown read-only above it.
 * Both inputs stay mounted in the same <form> throughout so the existing
 * one-shot loginAction and browser autocomplete keep working unchanged —
 * only which step is visible changes, via a client step flag.
 */
export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  // useActionState's state is server-returned and can't be cleared
  // directly — this flag just stops rendering it once the user edits a
  // field again, so a stale "wrong password" message doesn't linger past
  // the next attempt. Reset during render (not an effect — this is React's
  // documented "adjusting state when a prop changes" pattern) whenever
  // loginAction resolves with a fresh state object, so the next failed
  // attempt's error shows again too.
  const [dismissServerError, setDismissServerError] = useState(false);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    setDismissServerError(false);
  }
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailValid = isValidEmail(email);
  const showEmailError = attemptedContinue && !emailValid;
  const showServerError = state.error && !dismissServerError;

  function continueToPassword() {
    if (!emailValid) {
      setAttemptedContinue(true);
      return;
    }
    setStep("password");
    // Field only becomes focusable once this render commits.
    requestAnimationFrame(() => passwordRef.current?.focus());
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        // Belt-and-braces: whatever got us to the password step, never let
        // an actual submit through with an email that fails our format
        // check — the visible step and the hidden hard gate must agree.
        if (!emailValid) {
          e.preventDefault();
          setStep("email");
          setAttemptedContinue(true);
        }
      }}
    >
      {step === "email" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={showEmailError}
            onChange={(e) => {
              setEmail(e.target.value);
              setAttemptedContinue(false);
              setDismissServerError(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                continueToPassword();
              }
            }}
          />
          {showEmailError && <FieldError>Введите корректный email.</FieldError>}
        </div>
      ) : (
        <>
          <input type="hidden" name="email" value={email} />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-foreground">{email}</span>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setDismissServerError(true);
              }}
              className="flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3.5" />
              Изменить
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              onChange={() => setDismissServerError(true)}
            />
          </div>
        </>
      )}

      {showServerError && <FieldError>{state.error}</FieldError>}

      {step === "email" ? (
        <Button type="button" className="w-full" onClick={continueToPassword}>
          Продолжить
        </Button>
      ) : (
        <SubmitButton>Войти</SubmitButton>
      )}
    </form>
  );
}
