import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthBrand } from "@/components/auth/auth-brand";
import { LoginForm } from "@/components/forms/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-4">
      <AuthBrand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>С возвращением</CardTitle>
          <CardDescription>
            Войдите, чтобы продолжить работу с семейным архивом.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error === "stale-session" && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Ваша сессия устарела — войдите заново.
            </p>
          )}
          <GoogleSignInButton />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">или</span>
            <Separator className="flex-1" />
          </div>

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Ещё нет аккаунта?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
