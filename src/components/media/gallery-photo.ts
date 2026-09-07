import type {
  MediaRecord,
  MediaTaggedAlbum,
  MediaTaggedPerson,
} from "@/domain/media/media.service";

/** One photo plus who's tagged on it and which albums it belongs to — the shape PhotoGrid and PhotoLightbox both render. */
export interface GalleryPhotoView {
  media: MediaRecord;
  people: MediaTaggedPerson[];
  albums: MediaTaggedAlbum[];
}
