import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FamilyDashboardPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать в архив</CardTitle>
          <CardDescription>
            Дерево, профили и события появятся здесь на следующих этапах.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">MVP в разработке</Badge>
        </CardContent>
      </Card>
    </main>
  );
}
