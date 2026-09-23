import Image from "next/image";
import {
  personDisplayName,
  personInitials,
} from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonRecord } from "@/domain/person/person.service";
import type { FamilyRole } from "@/domain/family/roles";
import type { MediaRecord } from "@/domain/media/media.service";
import { LinkButton } from "@/components/ui/link-button";
import { DeletePersonButton } from "@/components/person/delete-person-button";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";

/**
 * Large, full-bleed hero photo atop a Person's profile, replacing the small
 * circular-avatar header. Shows ONLY the profile photo (person.photoMediaId,
 * passed in as `avatarMedia`) — deliberately not a photo from the person's
 * gallery, so this banner always matches what's shown for this person
 * everywhere else in the app (tree node, /people card); browsing the rest of
 * their photos happens in the "Фотографии" section below.
 *
 * `avatarMedia` is fetched separately in page.tsx via getMedia(), NOT looked
 * up from getPersonGallery()'s result — the avatar is its own Media row,
 * deliberately never tagged into the person's gallery (see
 * media.service.ts::uploadPersonAvatar's own doc comment: "an avatar is a
 * distinct thing from the photo gallery"), so it has no people/albums
 * pairing and no place in a PhotoGrid/PhotoLightbox-shaped list. Following
 * that same distinction, the hero is purely decorative here — not
 * clickable, no lightbox — rather than bolting on a one-off full-screen
 * viewer for a photo type that was deliberately kept out of the gallery
 * system in the first place (per explicit user request).
 *
 * Deliberately no thumbnail filmstrip here — that's the Story detail page's
 * pattern (see /impeccable follow-up), not the Person profile.
 *
 * Full-bleed: breaks out of the page's max-w-2xl column via the
 * left-1/2/-ml-[50vw] technique (see the wrapping <div>) so the banner spans
 * the full viewport width with zero top gap under the app header, while the
 * rest of the page (name/dates/basic info/etc.) stays in the readable
 * column — per explicit user request after the first version stayed
 * constrained to the column with visible top/side padding.
 *
 * Photo composition (per explicit user request, matching a reference
 * screenshot): the photo does NOT stretch edge to edge via object-cover on
 * the whole banner — it's a portrait-shaped panel pinned to the RIGHT ~60%
 * of the banner (its own object-cover crop within that panel only), sitting
 * on a dark background that fills the rest of the banner. A horizontal
 * gradient over the photo's left edge fades it into that background, and
 * the name/dates/actions sit in the un-photographed left portion — never on
 * top of the image itself. This reads as "a portrait with a caption plate,"
 * not "a wallpapered banner with text stamped over it."
 *
 * The background/gradient color is `avatarMedia.dominantColor` (sampled
 * server-side from the photo's own left edge at upload time — see
 * media.service.ts::sampleLeftEdgeColor) when available, so the fade
 * actually matches THIS photo instead of a fixed brand tone — per explicit
 * user request after the first version hardcoded bg-foreground regardless
 * of the photo's own colors. Falls back to the app's own --background token
 * (the page's body color, not a dark tone) only when there's no avatar at
 * all — every avatar uploaded through uploadPersonAvatar gets a real
 * dominantColor now (a one-off backfill script populated it for every
 * pre-existing avatar too), so this fallback path is reached only by a
 * person with no photo, not by "an old avatar" as a distinct case.
 *
 * Text color is picked by the ACTUAL banner color's luminance (see
 * `isLightColor`), not by "has a photo or not" — a real photo can sample to
 * a light color just as easily as the --background fallback can (e.g. a
 * portrait shot against a plain light-gray studio wall genuinely samples to
 * something like #dfdfdf), and white text on that is exactly as unreadable
 * as white text on the fallback itself. This was a real bug caught on real
 * data (Александр Купчик's own avatar, sampled to #dfdfdf after the
 * backfill): an early version keyed text color off "does avatarMedia exist"
 * instead of the color's own brightness, so a person with a light-background
 * photo still got white (text-background) text and it read as invisible,
 * near-white-on-light-gray.
 */
export function PersonProfileHero({
  person,
  personSlug,
  familyId,
  familySlug,
  role,
  avatarMedia,
}: {
  person: PersonRecord;
  personSlug: string;
  familyId: string;
  familySlug: string;
  role: FamilyRole;
  avatarMedia: MediaRecord | null;
}) {
  const canEdit = role === "owner" || role === "editor";
  // The app has no dark theme wired up (no ThemeProvider/next-themes toggle
  // anywhere in src/app) — --background always resolves to this same warm
  // near-white, so it's safe to hardcode here for the luminance check below
  // rather than needing a client-side computed-style read.
  const FALLBACK_BACKGROUND_HEX = "#fdf9f5";
  const bannerColorHex = isValidHexColor(avatarMedia?.dominantColor)
    ? avatarMedia.dominantColor
    : FALLBACK_BACKGROUND_HEX;
  const bannerColor = isValidHexColor(avatarMedia?.dominantColor)
    ? avatarMedia.dominantColor
    : "var(--background)";
  const isLightBanner = isLightColor(bannerColorHex);
  const textColorClass = isLightBanner ? "text-foreground" : "text-background";
  const subtextColorClass = isLightBanner
    ? "text-foreground/70"
    : "text-background/80";

  return (
    <div className="relative left-1/2 ml-[-50vw] w-screen">
      <div
        className="relative aspect-video w-full overflow-hidden sm:aspect-21/9"
        style={{ backgroundColor: bannerColor }}
      >
        <div className="absolute inset-y-0 right-0 w-3/5 sm:w-[55%]">
          {avatarMedia ? (
            <Image
              src={`/api/media/${avatarMedia.id}?familyId=${familyId}`}
              alt=""
              fill
              sizes="60vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
              unoptimized
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-secondary to-muted">
              <span className="font-heading text-5xl text-muted-foreground/60">
                {personInitials(person)}
              </span>
            </div>
          )}

          {/* Fades the photo's left edge into the banner's own background
              color (bannerColor, set on the outer element above) so the
              transition reads as one composed panel, not a hard seam
              between "photo" and "solid color." */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{
              backgroundImage: `linear-gradient(to right, ${bannerColor}, transparent)`,
            }}
          />
        </div>

        {/* absolute-positioned within the full-bleed banner, but the text/
            buttons themselves stay aligned to the page's own max-w-2xl
            column via this inner wrapper — so the banner spans edge to edge
            while the name/actions line up with everything below it. Sits in
            the un-photographed left portion of the banner, never over the
            photo itself. */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                className={`font-heading text-2xl font-medium sm:text-3xl ${textColorClass}`}
              >
                {personDisplayName(person)}
              </h1>
              <p className={`text-sm sm:text-base ${subtextColorClass}`}>
                {formatPartialDate(person.birthDate)}
                {!person.isLiving &&
                  ` — ${formatPartialDate(person.deathDate)}`}
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <LinkButton
                  variant="secondary"
                  size="sm"
                  href={`/families/${familySlug}/people/${personSlug}/edit`}
                >
                  Редактировать
                </LinkButton>
                {/* Deletion is restricted to owners — more destructive/
                    irreversible than regular editor-level CRUD (cascades to
                    relationships, event participation, media links). */}
                {role === "owner" && (
                  <DeletePersonButton
                    familyId={familyId}
                    personId={person.id}
                    personName={personDisplayName(person)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Guards against a malformed dominantColor value reaching a raw CSS
 *  string (defense in depth — the column is only ever written by
 *  sampleLeftEdgeColor's own "#rrggbb" output, but this is cheap enough to
 *  check before trusting a DB value inside an inline style). */
function isValidHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** WCAG relative luminance, used to pick readable text color against
 *  `hex` — a plain "is it perceptually bright" threshold (~0.6), not a
 *  precise contrast-ratio-against-a-specific-text-color computation, since
 *  the two text options here (text-foreground/text-background) are already
 *  near-black/near-white and either reliably passes AA against anything on
 *  the correct side of this threshold. */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6;
}
