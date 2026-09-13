"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Password field with a show/hide toggle — every password input in the app
 * (login, register, share-link password) renders through this instead of a
 * bare `<Input type="password">`, so the eye icon behaves identically
 * everywhere. The toggle is purely a client-side `type` swap — never
 * changes what gets submitted, so server-side validation is untouched.
 * Forwards its ref to the underlying <input> (login-form.tsx autofocuses it
 * via ref when the password step becomes visible).
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground focus-visible:text-muted-foreground"
      >
        {visible ? (
          <EyeOffIcon className="size-4.5" />
        ) : (
          <EyeIcon className="size-4.5" />
        )}
      </button>
    </div>
  );
});

export { PasswordInput };
