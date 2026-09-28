"use client";

import { useTranslations } from "next-intl";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { StretchHorizontalIcon, Trash2Icon } from "lucide-react";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { StoryPhotoOptions } from "./story-photo-node";
import { NodeToolButton } from "./node-tool-button";

/**
 * A photo in the story being written — set exactly as StoryFigure sets it
 * on the story page (column width or wide), with its caption typed right
 * under it and two tools over its corner: «Шире текста» and remove. Drag
 * the photo itself to move it.
 */
export function StoryPhotoView({
  node,
  selected,
  extension,
  updateAttributes,
  deleteNode,
}: ReactNodeViewProps) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const { familyId } = extension.options as StoryPhotoOptions;
  const mediaId = String(node.attrs.mediaId);
  const caption = String(node.attrs.caption ?? "");
  const wide = node.attrs.wide === true;

  return (
    <NodeViewWrapper
      as="figure"
      data-drag-handle=""
      className={cn(
        "group/photo relative my-2 flex flex-col gap-2.5",
        wide && "-mx-4 sm:-mx-8 lg:-mx-30",
      )}
    >
      <div
        contentEditable={false}
        className={cn(
          "relative overflow-hidden bg-muted ring-offset-2 ring-offset-background transition-shadow duration-base ease-(--ease-reveal)",
          wide ? "sm:rounded-[1.375rem]" : "rounded-[1.375rem]",
          selected && "ring-3 ring-ring",
        )}
      >
        <ArchiveImage
          src={mediaUrl(mediaId, familyId, "display")}
          alt={caption || tc("familyPhoto")}
          width={1600}
          height={1067}
          sizes={
            wide
              ? "(max-width: 1024px) 100vw, 944px"
              : "(max-width: 768px) 100vw, 640px"
          }
          className="h-auto w-full cursor-grab active:cursor-grabbing"
          draggable={false}
        />
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 transition-opacity duration-base ease-(--ease-reveal) [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/photo:opacity-100 [@media(hover:hover)]:group-hover/photo:opacity-100">
          <NodeToolButton
            label={t("photoWide")}
            pressed={wide}
            onClick={() => updateAttributes({ wide: !wide })}
          >
            <StretchHorizontalIcon />
          </NodeToolButton>
          <NodeToolButton label={t("photoRemoveInline")} onClick={deleteNode}>
            <Trash2Icon />
          </NodeToolButton>
        </div>
      </div>
      <input
        value={caption}
        onChange={(event) => updateAttributes({ caption: event.target.value })}
        placeholder={t("photoCaptionPlaceholder")}
        aria-label={t("photoCaptionPlaceholder")}
        maxLength={300}
        className={cn(
          "w-full rounded-sm bg-transparent text-[0.8125rem] leading-snug text-foreground/70 outline-none placeholder:text-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/50",
          wide && "px-4 sm:px-0",
        )}
      />
    </NodeViewWrapper>
  );
}
