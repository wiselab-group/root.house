import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>С возвращением</CardTitle>
          <CardDescription>Войдите, чтобы продолжить работу с семейным архивом.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error === "stale-session" && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Ваша сессия устарела — войдите заново.
            </p>
          )}
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Ещё нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
