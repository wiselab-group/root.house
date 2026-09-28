/**
 * What a Story's text points at, resolved on the server for the current
 * reader before rendering: the people it mentions (only those who exist in
 * this family) and the photos placed in it (only those the reader may see).
 * Anything missing here renders as plain text, or not at all for a photo.
 */
export interface StoryRefs {
  familyId: string;
  people: Record<string, { href: string }>;
  photos: Record<
    string,
    { width: number | null; height: number | null; alt: string | null }
  >;
}
