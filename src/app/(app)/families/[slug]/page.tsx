import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { FamilyDashboardSlugRow } from "@/components/family/family-dashboard-slug-row";

export default async function FamilyDashboardPage({ params }: PageProps<"/families/[slug]">) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать в архив</CardTitle>
          <CardDescription>Начните с семейного дерева или списка людей.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FamilyDashboardSlugRow />
          <div className="flex flex-wrap gap-3">
            <LinkButton href={`/families/${slug}/tree`}>Семейное дерево</LinkButton>
            <LinkButton variant="outline" href={`/families/${slug}/people`}>
              Люди
            </LinkButton>
            <LinkButton variant="outline" href={`/families/${slug}/search`}>
              Поиск
            </LinkButton>
            <LinkButton variant="outline" href={`/families/${slug}/places`}>
              Места
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
