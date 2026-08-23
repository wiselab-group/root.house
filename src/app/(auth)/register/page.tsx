import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { RegisterForm } from "@/components/forms/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Начать семейный архив</CardTitle>
          <CardDescription>Создайте аккаунт, чтобы завести своё первое семейное дерево.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <GoogleSignInButton />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">или</span>
            <Separator className="flex-1" />
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
