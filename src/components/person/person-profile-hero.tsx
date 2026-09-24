import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, MapPinIcon, LockIcon } from "lucide-react";
import {
  personDisplayName,
  personInitials,
} from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { MediaRecord } from "@/domain/media/media.service";
import type { FamilyRole } from "@/domain/family/roles";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";
import { HeroMoreMenu } from "@/components/hero/hero-more-menu";
import { HeroTopBar } from "@/components/hero/hero-top-bar";
import { HeroMeta, type HeroMetaItem } from "@/components/hero/hero-meta";
import { glassChip } from "@/components/hero/glass";

/**
 * The Person Profile's hero, in the dark "photo dissolves into the page"
 * style the user picked from two reference screenshots (2026-09-24): the
 * portrait sits on the right and fades out on its left and bottom edges
 * (.hero-photo-mask) into a page background tinted by the same photo
 * (.photo-backdrop, set up by page.tsx) — never a hard-edged banner.
 *
 * Shows ONLY the profile photo (person.photoMediaId, fetched separately as
 * `avatarMedia` since avatars are deliberately never tagged into the
 * gallery — see media.service.ts::uploadPersonAvatar), and deliberately no
 * thumbnail filmstrip: that's the Story page's pattern. A filmstrip was
 * tried here and removed on explicit user request — it duplicated the
 * Фото tab.
 *
 * Edit and delete live under the single «⋮» pill in the top glass bar,
 * away from the face (user request: no separate «Редактировать» pill).
 */
export function PersonProfileHero({
  person,
  familyId,
  familySlug,
  avatarMedia,
  birthPlaceName,
  deathPlaceName,
  role,
}: {
  person: PersonRecord;
  familyId: string;
  familySlug: string;
  avatarMedia: MediaRecord | null;
  birthPlaceName: string | null;
  deathPlaceName: string | null;
  role: FamilyRole;
}) {
  const canEdit = role === "owner" || role === "editor";
  const name = personDisplayName(person);
  const editHref = `/families/${familySlug}/people/${person.slug}/edit`;

  const meta: HeroMetaItem[] = [];
  const lifeSpan = lifeSpanLabel(person);
  if (lifeSpan) meta.push({ Icon: CalendarIcon, label: lifeSpan });
  const places = [birthPlaceName, deathPlaceName].filter(Boolean).join(" → ");
  if (places) meta.push({ Icon: MapPinIcon, label: places });

  return (
    <header className="relative isolate h-[clamp(440px,48vw,620px)] overflow-hidden">
      {avatarMedia ? (
        <div className="hero-photo-mask absolute inset-y-0 right-0 w-full sm:right-[4%] sm:w-[54%]">
          <Image
            src={`/api/media/${avatarMedia.id}?familyId=${familyId}`}
            alt=""
            fill
            sizes="(min-width: 640px) 54vw, 100vw"
            className="object-cover object-[50%_20%]"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            unoptimized
            priority
          />
        </div>
      ) : (
        <div className="absolute top-20 left-4 grid size-32 place-items-center rounded-full border border-dashed border-foreground/25 font-sans text-4xl font-light text-foreground/50 sm:top-1/2 sm:right-[12%] sm:left-auto sm:size-56 sm:-translate-y-1/2 sm:text-7xl">
          {personInitials(person)}
          {canEdit && (
            <Link
              href={editHref}
              className="absolute -bottom-9 text-sm font-medium whitespace-nowrap text-primary hover:opacity-80"
            >
              + Загрузить портрет
            </Link>
          )}
        </div>
      )}

      <HeroTopBar
        backHref={`/families/${familySlug}/people`}
        backLabel="Люди"
        actions={
          canEdit && (
            <HeroMoreMenu
              editHref={editHref}
              deleteTarget={
                role === "owner"
                  ? { kind: "person", familyId, personId: person.id, name }
                  : null
              }
            />
          )
        }
      />

      <div className="absolute inset-x-4 bottom-10 z-10 flex flex-col gap-4 sm:right-auto sm:bottom-16 sm:left-11 sm:max-w-[min(560px,46%)]">
        {(person.isPlaceholder || person.privacyLevel === "private") && (
          <div className="flex flex-wrap gap-1.5">
            {person.isPlaceholder && (
              <span className={glassChip}>Запись-заглушка</span>
            )}
            {person.privacyLevel === "private" && (
              <span className={glassChip}>
                <LockIcon aria-hidden="true" />
                Только я
              </span>
            )}
          </div>
        )}
        <h1 className="text-4xl leading-[1.04] font-light tracking-[-0.025em] text-balance sm:text-5xl lg:text-6xl">
          {name}
        </h1>
        <HeroMeta items={meta} />
      </div>
    </header>
  );
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
