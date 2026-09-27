"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("tree");
  const params = useParams<{ slug: string }>();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("errorTitle")}</CardTitle>
          <CardDescription>{t("errorBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkButton href={`/families/${params.slug}`}>
            {t("backToFamily")}
          </LinkButton>
        </CardContent>
      </Card>
    </main>
  );
}
