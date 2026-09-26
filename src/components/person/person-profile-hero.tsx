import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import Link from "next/link";
import { LockIcon, UserRoundIcon } from "lucide-react";
import {
  personDisplayName,
  personInitials,
} from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.service";
import type { ProfilePlace } from "@/domain/person/profile-place";
import type { MediaRecord } from "@/domain/media/media.service";
import type { FamilyRole } from "@/domain/family/roles";
import { HeroMoreMenu } from "@/components/hero/hero-more-menu";
import { HeroTopBar } from "@/components/hero/hero-top-bar";
import { HeroMeta } from "@/components/hero/hero-meta";
import { glassChip } from "@/components/hero/glass";
import { personHeroMeta } from "./person-hero-meta";

/**
 * The Person Profile's hero, in the dark "photo dissolves into the page"
 * style the user picked from two reference screenshots (2026-09-24): the
 * portrait sits on the right and fades out on its edges (.hero-photo-mask)
 * into the dark archive page background (.photo-backdrop, set up by
 * page.tsx — one fixed tone, same as Family Home) — never a hard-edged
 * banner.
 *
 * Shows ONLY the portrait (person.photoMediaId, fetched as `avatarMedia` —
 * one of the person's gallery photos, see media.service.ts::uploadPersonAvatar
 * and «Сделать портретом» in the gallery), and deliberately no
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
  place,
  role,
}: {
  person: PersonRecord;
  familyId: string;
  familySlug: string;
  avatarMedia: MediaRecord | null;
  place: ProfilePlace | null;
  role: FamilyRole;
}) {
  const canEdit = role === "owner" || role === "editor";
  const name = personDisplayName(person);
  const editHref = `/families/${familySlug}/people/${person.slug}/edit`;

  const meta = personHeroMeta(person, place);

  return (
    <header className="relative isolate h-[clamp(440px,48vw,620px)] overflow-hidden">
      {avatarMedia ? (
        <div className="hero-photo-mask absolute inset-y-0 right-0 w-full sm:right-[4%] sm:w-[54%]">
          <ArchiveImage
            src={mediaUrl(avatarMedia.id, familyId, "display")}
            alt=""
            fill
            sizes="(min-width: 640px) 54vw, 100vw"
            className="object-cover object-[50%_20%]"
            priority
            fade={false}
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
        {/* The page-type pill always leads, like the Story page's «История»
            (user request) — then the status pills, only when they apply. */}
        <div className="flex flex-wrap gap-1.5">
          <span className={glassChip}>
            <UserRoundIcon aria-hidden="true" />
            Профиль
          </span>
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
        <h1 className="font-heading text-4xl leading-[1.05] font-normal tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {name}
        </h1>
        <HeroMeta items={meta} />
      </div>
    </header>
  );
}
