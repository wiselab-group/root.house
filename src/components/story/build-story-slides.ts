import { getMedia, type MediaRecord } from "@/domain/media/media.service";
import { personDisplayName } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.repository";
import type { CarouselSlide } from "./story-carousel";

/**
 * The hero carousel's slides: the story's own attached photos; when it has
 * none (most stories today — e.g. the real «История любви»), the portraits
 * of the people in it, so the page still opens on faces rather than an
 * empty frame. A photo is "wide" (fills the hero) when clearly landscape;
 * avatars carry no stored dimensions and are portraits by nature.
 */
export async function buildStorySlides(
  storyPhotos: MediaRecord[],
  people: PersonRecord[],
  familyId: string,
): Promise<(CarouselSlide & { dominantColor: string | null })[]> {
  const toSlide = (media: MediaRecord, caption: string | null) => ({
    id: media.id,
    src: `/api/media/${media.id}?familyId=${familyId}`,
    alt: caption ?? "",
    caption,
    fit:
      media.width && media.height && media.width > media.height * 1.15
        ? ("wide" as const)
        : ("tall" as const),
    dominantColor: media.dominantColor,
  });

  if (storyPhotos.length > 0) {
    return storyPhotos.map((media) =>
      toSlide(media, media.title ?? media.description),
    );
  }
  const avatars = await Promise.all(
    people.map(async (person) => {
      if (!person.photoMediaId) return null;
      const media = await getMedia(person.photoMediaId, familyId);
      return media ? toSlide(media, personDisplayName(person)) : null;
    }),
  );
  return avatars.filter((slide) => slide !== null);
}
