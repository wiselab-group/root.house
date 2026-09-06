"use client";

import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

/**
 * Route-scoped error boundary for the family tree page. The layout engine
 * (src/domain/tree/layout/) validates its own output and throws rather than
 * silently rendering an overlapping/broken tree (see
 * tree.service.ts::getFocusTreeLayout) — this is what a family sees instead
 * of Next.js's generic error screen when that happens.
 */
export default function FamilyTreeError() {
  const params = useParams<{ slug: string }>();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Не удалось построить дерево для этой семьи</CardTitle>
          <CardDescription>
            Что-то пошло не так при расчёте расположения карточек. Мы уже знаем
            об ошибке — попробуйте вернуться на страницу семьи.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkButton href={`/families/${params.slug}`}>
            Вернуться к семье
          </LinkButton>
        </CardContent>
      </Card>
    </main>
  );
}
