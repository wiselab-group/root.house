"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PasswordInput } from "@/components/ui/password-input";

/** «Срок действия» + «Пароль» of a new Share Link — the fields that don't
 *  depend on the chosen visibility scope (CreateShareLinkForm). */
export function ShareLinkAccessFields({
  passwordError,
}: {
  passwordError?: string;
}) {
  const t = useTranslations("shareLinks");
  return (
    <>
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
        {passwordError && (
          <p className="text-xs text-destructive">{passwordError}</p>
        )}
      </div>
    </>
  );
}
