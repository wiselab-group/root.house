import { BookOpen, Images, MapPin, Settings, Users } from "lucide-react";
import { FamilyNavCard } from "./family-nav-card";

/**
 * Family Home's «Другие разделы архива» grid — the hub's links to every
 * other section (Family Home is the single navigation hub, no persistent
 * nav elsewhere). Split out of page.tsx to keep it under 150 lines.
 */
export function FamilySectionLinks({ familySlug }: { familySlug: string }) {
  const base = `/families/${familySlug}`;
  const links = [
    {
      href: `${base}/people`,
      icon: Users,
      label: "Люди",
      description: "Профили, поиск по имени и году",
    },
    {
      href: `${base}/stories`,
      icon: BookOpen,
      label: "Истории",
      description: "Семейные истории и воспоминания",
    },
    {
      href: `${base}/photos`,
      icon: Images,
      label: "Архив",
      description: "Фото, видео и документы семьи",
    },
    {
      href: `${base}/map`,
      icon: MapPin,
      label: "Карта",
      description: "Места рождения, проживания и событий",
    },
    {
      href: `${base}/settings`,
      icon: Settings,
      label: "Настройки",
      description: "Название, ссылка и описание архива",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/55">Другие разделы архива</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link, index) => (
          <div
            key={link.href}
            className="animate-content-enter h-full"
            style={{ animationDelay: `${160 + index * 60}ms` }}
          >
            <FamilyNavCard {...link} />
          </div>
        ))}
      </div>
    </div>
  );
}
