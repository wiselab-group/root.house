import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listFamiliesForUser } from "@/domain/family/family.service";

export default async function FamiliesPage() {
  const session = await auth();
  const families = session?.user ? await listFamiliesForUser(session.user.id) : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Мои семьи</h1>
          <p className="text-muted-foreground">Выберите архив или создайте новый.</p>
        </div>
        <Button render={<Link href="/families/new" />}>Создать семью</Button>
      </div>

      {families.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Пока пусто</CardTitle>
            <CardDescription>
              Создайте первую семью, чтобы начать собирать родословную.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {families.map((family) => (
            <li key={family.id}>
              <Link href={`/families/${family.id}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle>{family.name}</CardTitle>
                    {family.description && <CardDescription>{family.description}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
