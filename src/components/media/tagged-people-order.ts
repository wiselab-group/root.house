import type { GalleryPhotoView } from "./gallery-photo";

type TaggedPerson = GalleryPhotoView["people"][number];

/**
 * Tagged people in the order they stand on the photo — left to right, the
 * way captions under group photos have always named them. Ties on x (one
 * person behind another) go top to bottom. People tagged without a point
 * on the photo come last, in their original order.
 */
export function sortLeftToRight(people: TaggedPerson[]): TaggedPerson[] {
  return people
    .map((person, index) => ({ person, index }))
    .sort((a, b) => {
      const ax = a.person.xPercent;
      const bx = b.person.xPercent;
      if (ax === null || bx === null) {
        if (ax === bx) return a.index - b.index;
        return ax === null ? 1 : -1;
      }
      if (ax !== bx) return ax - bx;
      return (a.person.yPercent ?? 0) - (b.person.yPercent ?? 0);
    })
    .map(({ person }) => person);
}
