import { CalendarIcon, HouseIcon, MapPinIcon } from "lucide-react";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { ProfilePlace } from "@/domain/person/profile-place";
import type { HeroMetaItem } from "@/components/hero/hero-meta";

/** The icon + text line under the Person profile's name: dates, then place. */
export function personHeroMeta(
  person: PersonRecord,
  place: ProfilePlace | null,
): HeroMetaItem[] {
  const meta: HeroMetaItem[] = [];
  const lifeSpan = lifeSpanLabel(person);
  if (lifeSpan) meta.push({ Icon: CalendarIcon, label: lifeSpan });
  if (place) meta.push(placeMetaItem(place));
  return meta;
}

/** "12 марта 1988 г." for the living (no «род.» prefix, no dangling dash), "1938 г. — 2011 г." otherwise. */
function lifeSpanLabel(person: PersonRecord): string | null {
  const hasBirth = person.birthDate?.year != null;
  const hasDeath = person.deathDate?.year != null;
  if (person.isLiving) {
    return hasBirth ? formatPartialDate(person.birthDate) : null;
  }
  if (!hasBirth && !hasDeath) return null;
  return `${hasBirth ? formatPartialDate(person.birthDate) : "?"} — ${hasDeath ? formatPartialDate(person.deathDate) : "?"}`;
}

function placeMetaItem(place: ProfilePlace): HeroMetaItem {
  switch (place.kind) {
    case "journey":
      return {
        Icon: MapPinIcon,
        label: place.from,
        hint: "Место рождения",
        then: { Icon: HouseIcon, label: place.to, hint: "Живёт сейчас" },
      };
    case "home":
      return {
        Icon: HouseIcon,
        label: place.label,
        hint: "Место рождения и нынешний дом",
      };
    case "residence":
      return { Icon: HouseIcon, label: place.label, hint: "Живёт сейчас" };
    case "birth":
      return { Icon: MapPinIcon, label: place.label, hint: "Место рождения" };
    case "life":
      return { Icon: MapPinIcon, label: place.label };
  }
}
