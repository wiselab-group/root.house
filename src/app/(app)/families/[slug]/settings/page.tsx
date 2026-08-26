import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FamilySettingsDetailsRow } from "@/components/family/family-settings-details-row";
import { FamilySettingsSlugRow } from "@/components/family/family-settings-slug-row";
import { FamilySettingsFocusRow } from "@/components/family/family-settings-focus-row";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export default async function FamilySettingsPage({
  params,
}: PageProps<"/families/[slug]/settings">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const family = await getFamilySummary(familyId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Настройки" },
        ]}
      />
      <div>
        <h1 className="font-heading text-2xl font-medium">Настройки</h1>
        <p className="text-muted-foreground">Название, ссылка и описание архива.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Об архиве</CardTitle>
          <CardDescription>Видно всем участникам семьи.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FamilySettingsDetailsRow />
          <FamilySettingsSlugRow />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Семейное дерево</CardTitle>
          <CardDescription>Личная настройка — видна только вам.</CardDescription>
        </CardHeader>
        <CardContent>
          <FamilySettingsFocusRow />
        </CardContent>
      </Card>
    </main>
  );
}
