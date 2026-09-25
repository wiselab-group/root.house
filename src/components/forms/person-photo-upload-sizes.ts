/** PersonPhotoUpload's two sizes — the full picker, and the compact one on the edit page. */
export const PHOTO_UPLOAD_SIZE_STYLES = {
  default: {
    dropzone: "size-24",
    avatar: "size-24!",
    fallbackText: "text-lg",
    camera: "size-6",
    remove: "size-6 [&_svg]:size-3.5",
  },
  compact: {
    dropzone: "size-20",
    avatar: "size-20!",
    fallbackText: "text-base",
    camera: "size-5",
    remove: "size-6 [&_svg]:size-3.5",
  },
} as const;
