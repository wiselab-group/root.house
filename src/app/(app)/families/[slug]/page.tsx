import { Network, Users, MapPin, Settings } from "lucide-react";
import { FamilyNavCard } from "@/components/family/family-nav-card";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export default async function FamilyDashboardPage({
  params,
}: PageProps<"/families/[slug]">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const family = await getFamilySummary(familyId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug },
        ]}
      />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">
          {family?.name ?? slug}
        </h1>
        {family?.description && (
          <p className="text-muted-foreground">{family.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FamilyNavCard
          href={`/families/${slug}/tree`}
          icon={Network}
          label="Семейное дерево"
          description="Интерактивная схема родственных связей"
        />
        <FamilyNavCard
          href={`/families/${slug}/people`}
          icon={Users}
          label="Люди"
          description="Профили, поиск по имени и году"
        />
        <FamilyNavCard
          href={`/families/${slug}/places`}
          icon={MapPin}
          label="Места"
          description="Места рождения, проживания и событий"
        />
        <FamilyNavCard
          href={`/families/${slug}/settings`}
          icon={Settings}
          label="Настройки"
          description="Название, ссылка и описание архива"
        />
      </div>
    </main>
  );
}
