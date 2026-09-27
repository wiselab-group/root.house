import { CalendarIcon, HouseIcon, MapPinIcon } from "lucide-react";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { ProfilePlace } from "@/domain/person/profile-place";
import type { HeroMetaItem } from "@/components/hero/hero-meta";
import type { Locale } from "@/domain/shared/locale";

/** Place hints, already translated by the caller (messages `profile.*`). */
export interface PlaceHints {
  birthPlace: string;
  livesNow: string;
  birthAndHome: string;
}

/** The icon + text line under the Person profile's name: dates, then place. */
export function personHeroMeta(
  person: PersonRecord,
  place: ProfilePlace | null,
  locale: Locale,
  hints: PlaceHints,
): HeroMetaItem[] {
  const meta: HeroMetaItem[] = [];
  const lifeSpan = lifeSpanLabel(person, locale);
  if (lifeSpan) meta.push({ Icon: CalendarIcon, label: lifeSpan });
  if (place) meta.push(placeMetaItem(place, hints));
  return meta;
}

/** "12 марта 1988 г." for the living (no «род.» prefix, no dangling dash), "1938 г. — 2011 г." otherwise. */
function lifeSpanLabel(person: PersonRecord, locale: Locale): string | null {
  const hasBirth = person.birthDate?.year != null;
  const hasDeath = person.deathDate?.year != null;
  if (person.isLiving) {
    return hasBirth ? formatPartialDate(person.birthDate, locale) : null;
  }
  if (!hasBirth && !hasDeath) return null;
  return `${hasBirth ? formatPartialDate(person.birthDate, locale) : "?"} — ${hasDeath ? formatPartialDate(person.deathDate, locale) : "?"}`;
}

function placeMetaItem(place: ProfilePlace, hints: PlaceHints): HeroMetaItem {
  switch (place.kind) {
    case "journey":
      return {
        Icon: MapPinIcon,
        label: place.from,
        hint: hints.birthPlace,
        then: { Icon: HouseIcon, label: place.to, hint: hints.livesNow },
      };
    case "home":
      return {
        Icon: HouseIcon,
        label: place.label,
        hint: hints.birthAndHome,
      };
    case "residence":
      return { Icon: HouseIcon, label: place.label, hint: hints.livesNow };
    case "birth":
      return { Icon: MapPinIcon, label: place.label, hint: hints.birthPlace };
    case "life":
      return { Icon: MapPinIcon, label: place.label };
  }
}
