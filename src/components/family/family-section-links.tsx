import { useTranslations } from "next-intl";
import { BookOpen, Images, MapPin, Settings, Users } from "lucide-react";
import { FamilyNavCard } from "./family-nav-card";

/**
 * Family Home's «Другие разделы архива» grid — the hub's links to every
 * other section (Family Home is the single navigation hub, no persistent
 * nav elsewhere). Split out of page.tsx to keep it under 150 lines.
 */
export function FamilySectionLinks({ familySlug }: { familySlug: string }) {
  const t = useTranslations("familyHome");
  const tn = useTranslations("familyNav");
  const base = `/families/${familySlug}`;
  const links = [
    {
      href: `${base}/people`,
      icon: Users,
      label: tn("people"),
      description: t("peopleDescription"),
    },
    {
      href: `${base}/stories`,
      icon: BookOpen,
      label: tn("stories"),
      description: t("storiesDescription"),
    },
    {
      href: `${base}/photos`,
      icon: Images,
      label: tn("photos"),
      description: t("photosDescription"),
    },
    {
      href: `${base}/map`,
      icon: MapPin,
      label: tn("map"),
      description: t("mapDescription"),
    },
    {
      href: `${base}/settings`,
      icon: Settings,
      label: tn("settings"),
      description: t("settingsDescription"),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/55">{t("otherSections")}</p>
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
