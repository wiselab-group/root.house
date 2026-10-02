/**
 * Archival photos the landing dresses its fictional family in — public
 * domain or no known restrictions on Wikimedia Commons (checked 2026-10-02), cropped of their film
 * borders into public/landing/. Not the people they're shown as: the
 * landing says so under the hero (`landing.demoNote`). Static marketing
 * images, so plain next/image — ArchiveImage/mediaUrl are for family media.
 */
export type LandingPhoto = {
  src: string;
  width: number;
  height: number;
  /** Where it came from, for the record (license: public domain). */
  source: string;
};

export const LANDING_PHOTOS = {
  /** Unknown author, Brazil, 1940s–50s. */
  wedding: {
    src: "/landing/wedding.jpg",
    width: 853,
    height: 1193,
    source:
      "https://commons.wikimedia.org/wiki/File:Fotografia_de_Casamento,_anos_40-50.jpg",
  },
  /** Marjory Collins, Greenbelt, Maryland, 1942 (Library of Congress). */
  stroll: {
    src: "/landing/stroll.jpg",
    width: 868,
    height: 931,
    source:
      "https://commons.wikimedia.org/wiki/File:Greenbelt,_Maryland._Family_strolling_on_Sunday8d21147v.jpg",
  },
  /** State Library of Queensland, 1950. */
  grandmother: {
    src: "/landing/grandmother.jpg",
    width: 980,
    height: 711,
    source:
      "https://commons.wikimedia.org/wiki/File:StateLibQld_1_95504_White_Family.jpg",
  },
  /** Tyne & Wear Archives & Museums (Flickr Commons, no known
   *  copyright restrictions). */
  ballroom: {
    src: "/landing/ballroom.jpg",
    width: 1541,
    height: 1209,
    source:
      "https://commons.wikimedia.org/wiki/File:The_Majestic_Ballroom_(10291804026).jpg",
  },
  /** State Library of Queensland, 1950. */
  weddingParty: {
    src: "/landing/wedding-party.jpg",
    width: 980,
    height: 736,
    source:
      "https://commons.wikimedia.org/wiki/File:StateLibQld_1_173791_Bride_and_attendants_at_Cook_wedding,_1950.jpg",
  },
  /** Faces cropped from `wedding` for the tree cards' photos. */
  ivanPortrait: {
    src: "/landing/ivan.jpg",
    width: 176,
    height: 176,
    source:
      "https://commons.wikimedia.org/wiki/File:Fotografia_de_Casamento,_anos_40-50.jpg",
  },
  veraPortrait: {
    src: "/landing/vera.jpg",
    width: 176,
    height: 176,
    source:
      "https://commons.wikimedia.org/wiki/File:Fotografia_de_Casamento,_anos_40-50.jpg",
  },
} as const satisfies Record<string, LandingPhoto>;
