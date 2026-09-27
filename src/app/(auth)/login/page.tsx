import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/forms/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, callbackUrl } = await searchParams;
  const callbackUrlValue = Array.isArray(callbackUrl)
    ? callbackUrl[0]
    : callbackUrl;
  const t = await getTranslations("auth");

  return (
    <AuthShell>
      <Card
        className="w-full max-w-sm animate-content-enter rounded-2xl shadow-sm"
        style={{ animationDelay: "80ms" }}
      >
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {t("welcomeBack")}
          </CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error === "stale-session" && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t("staleSession")}
            </p>
          )}
          <GoogleSignInButton callbackUrl={callbackUrlValue} />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <Separator className="flex-1" />
          </div>

          <LoginForm callbackUrl={callbackUrlValue} />

          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("signUp")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
