import type { Metadata } from "next";
import { Users, Images, MapPin, Settings } from "lucide-react";
import {
  FamilyNavCard,
  FamilyTreeLaunchCard,
} from "@/components/family/family-nav-card";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const family = await getFamilySummary(familyId);
  return { title: family?.name ?? slug };
}

export default async function FamilyDashboardPage({
  params,
}: PageProps<"/families/[slug]">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const family = await getFamilySummary(familyId);

  const secondaryLinks = [
    {
      href: `/families/${slug}/people`,
      icon: Users,
      label: "Люди",
      description: "Профили, поиск по имени и году",
    },
    {
      href: `/families/${slug}/photos`,
      icon: Images,
      label: "Фото",
      description: "Все фотографии семьи в одном месте",
    },
    {
      href: `/families/${slug}/places`,
      icon: MapPin,
      label: "Места",
      description: "Места рождения, проживания и событий",
    },
    {
      href: `/families/${slug}/settings`,
      icon: Settings,
      label: "Настройки",
      description: "Название, ссылка и описание архива",
    },
  ] as const;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {family?.name ?? slug}
        </h1>
        {family?.description && (
          <p className="max-w-prose text-muted-foreground">
            {family.description}
          </p>
        )}
      </div>

      <div className="animate-content-enter">
        <FamilyTreeLaunchCard
          href={`/families/${slug}/tree`}
          description="Интерактивная схема родственных связей"
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Другие разделы архива</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {secondaryLinks.map((link, index) => (
            <div
              key={link.href}
              className="animate-content-enter h-full"
              style={{ animationDelay: `${80 + index * 60}ms` }}
            >
              <FamilyNavCard {...link} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
