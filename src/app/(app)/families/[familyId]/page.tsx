import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function FamilyDashboardPage({ params }: PageProps<"/families/[familyId]">) {
  const { familyId } = await params;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать в архив</CardTitle>
          <CardDescription>Начните с семейного дерева или списка людей.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <LinkButton href={`/families/${familyId}/tree`}>Семейное дерево</LinkButton>
          <LinkButton variant="outline" href={`/families/${familyId}/people`}>
            Люди
          </LinkButton>
          <LinkButton variant="outline" href={`/families/${familyId}/search`}>
            Поиск
          </LinkButton>
          <LinkButton variant="outline" href={`/families/${familyId}/places`}>
            Места
          </LinkButton>
        </CardContent>
      </Card>
    </main>
  );
}
