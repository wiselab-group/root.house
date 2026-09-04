import Link from "next/link";
import { auth } from "@/lib/auth";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listFamiliesForUser } from "@/domain/family/family.service";
import { personCountLabel } from "@/domain/shared/pluralize-ru";

export default async function FamiliesPage() {
  const session = await auth();
  const families = session?.user
    ? await listFamiliesForUser(session.user.id)
    : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-medium">Мои семьи</h1>
          <p className="text-muted-foreground">
            Выберите архив или создайте новый.
          </p>
        </div>
        <LinkButton href="/families/new">Создать семью</LinkButton>
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
              <Link href={`/families/${family.slug}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle>{family.name}</CardTitle>
                    {family.description && (
                      <CardDescription>{family.description}</CardDescription>
                    )}
                    <CardAction>
                      <Badge variant="outline">
                        {personCountLabel(family.personCount)}
                      </Badge>
                    </CardAction>
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
