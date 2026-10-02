import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { PrivacyConsent } from "@/components/auth/privacy-consent";
import { RegisterForm } from "@/components/forms/register-form";
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
  return { title: t("registerTitle") };
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const { callbackUrl } = await searchParams;
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
            {t("registerHeading")}
          </CardTitle>
          <CardDescription>{t("registerDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <GoogleSignInButton callbackUrl={callbackUrlValue} />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <Separator className="flex-1" />
          </div>

          <RegisterForm callbackUrl={callbackUrlValue} />

          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("signIn")}
            </Link>
          </p>
          <PrivacyConsent />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
