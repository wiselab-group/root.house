import {
  FileTextIcon,
  FileImageIcon,
  FileIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a Media row's mimeType to the icon/label DocumentList shows for it —
 * ALLOWED_CONTENT_TYPES in api/media/upload-document/route.ts is the
 * authoritative list of what can actually get uploaded, this only decides
 * how each of those types is *presented*. Falls back to the generic FileIcon
 * for any future type added to the upload allowlist without a matching
 * update here, rather than rendering nothing.
 */
export function documentFileType(mimeType: string): {
  Icon: LucideIcon;
  label: string;
} {
  if (mimeType === "application/pdf") {
    return { Icon: FileTextIcon, label: "PDF" };
  }
  if (mimeType.startsWith("image/")) {
    const subtype = mimeType.split("/")[1]?.toUpperCase() ?? "Изображение";
    return { Icon: FileImageIcon, label: subtype };
  }
  return { Icon: FileIcon, label: "Файл" };
}
