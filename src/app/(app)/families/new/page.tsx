import { CreateFamilyForm } from "@/components/forms/create-family-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";

export default function NewFamilyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: "Новая семья" },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Новая семья</CardTitle>
          <CardDescription>
            Это станет отдельным архивом — людей, события и фото можно будет
            пригласить редактировать родственникам позже.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateFamilyForm />
        </CardContent>
      </Card>
    </main>
  );
}
