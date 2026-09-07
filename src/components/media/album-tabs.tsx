import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Pill-nav row of album tabs above the photo grid — plain Links, not a
 * client Tabs primitive: each "tab" is really /families/[slug]/photos or
 * /photos/[albumId], a real shareable/bookmarkable SSR route (matching how
 * people/[personSlug] etc. already navigate via route segments, not
 * client-side tab state), so no JS is needed to switch between them.
 */
export function AlbumTabs({
  familySlug,
  albums,
  activeAlbumId,
}: {
  familySlug: string;
  albums: { id: string; name: string }[];
  activeAlbumId: string | null;
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Альбомы">
      <Link
        href={`/families/${familySlug}/photos`}
        aria-current={activeAlbumId === null ? "page" : undefined}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm transition-colors",
          activeAlbumId === null
            ? "bg-accent text-accent-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground",
        )}
      >
        Все фото
      </Link>
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/families/${familySlug}/photos/${album.id}`}
          aria-current={activeAlbumId === album.id ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            activeAlbumId === album.id
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {album.name}
        </Link>
      ))}
    </nav>
  );
}
