"use client";

import { useTranslations } from "next-intl";
import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Trash2Icon } from "lucide-react";
import { NodeToolButton } from "./node-tool-button";

/**
 * A letter or document being written into the story — the same sheet of
 * paper the story page shows (story-blocks.tsx's storyLetter), with its
 * text typed straight onto it and the caption («Письмо к Ольге, 12 января
 * 1919») under a rule at the bottom.
 */
export function StoryLetterView({
  node,
  updateAttributes,
  deleteNode,
}: ReactNodeViewProps) {
  const t = useTranslations("storyForm");
  const caption = String(node.attrs.caption ?? "");

  return (
    <NodeViewWrapper
      as="figure"
      className="group/letter relative my-3 flex -rotate-[0.6deg] flex-col gap-3.5 rounded-md bg-paper bg-[radial-gradient(color-mix(in_oklch,var(--paper-ink)_7%,transparent)_1px,transparent_1.2px)] bg-size-[5px_5px] px-5.5 pt-6 pb-5 text-paper-ink shadow-[0_24px_40px_-24px_color-mix(in_oklch,black_45%,transparent)] motion-reduce:rotate-0 sm:px-9 sm:pt-8 sm:pb-6.5"
    >
      <div
        contentEditable={false}
        className="absolute -top-3 -right-3 transition-opacity duration-base ease-(--ease-reveal) [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/letter:opacity-100 [@media(hover:hover)]:group-hover/letter:opacity-100"
      >
        <NodeToolButton label={t("letterRemove")} onClick={deleteNode}>
          <Trash2Icon />
        </NodeToolButton>
      </div>
      <NodeViewContent className="story-letter-body flex flex-col gap-3.5 font-heading text-lg leading-[1.6] italic outline-none sm:text-xl" />
      <input
        contentEditable={false}
        value={caption}
        onChange={(event) => updateAttributes({ caption: event.target.value })}
        placeholder={t("letterCaptionPlaceholder")}
        aria-label={t("letterCaptionLabel")}
        maxLength={200}
        className="w-full rounded-sm border-t border-paper-ink/18 bg-transparent pt-2.5 text-[0.8125rem] text-paper-ink/75 outline-none placeholder:text-paper-ink/45 focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </NodeViewWrapper>
  );
}
