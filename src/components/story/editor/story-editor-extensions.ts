import { mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Blockquote from "@tiptap/extension-blockquote";
import Mention from "@tiptap/extension-mention";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { Placeholder } from "@tiptap/extensions";
import { SAFE_LINK } from "@/domain/story/story-doc";
import { StoryPhotoNode } from "./story-photo-node";
import { StoryLetterNode } from "./story-letter-node";
import type { MentionPerson } from "./use-mention-suggestion";

/**
 * The story editor's schema — exactly story-doc.ts's vocabulary and no
 * more: paragraphs with bold/italic/links, line breaks, chapter headings
 * (h2 only), quotes of plain paragraphs, lists, archive photos, letters,
 * and «@» mentions. Pasted content outside it (images, tables, code,
 * other heading levels) is reduced to text by the schema itself.
 * Markdown shortcuts come with StarterKit: `## ` chapter, `> ` quote,
 * `- `/`1. ` list, `**bold**`, `*italic*`.
 */
export function storyEditorExtensions({
  familyId,
  placeholder,
  suggestion,
}: {
  familyId: string;
  placeholder: string;
  suggestion: Omit<
    SuggestionOptions<MentionPerson, MentionNodeAttrs>,
    "editor"
  >;
}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => SAFE_LINK.test(url),
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
      },
    }),
    // A quote holds paragraphs only — the story page sets it as one voice.
    Blockquote.extend({ content: "paragraph+" }),
    Placeholder.configure({
      placeholder: ({ editor }) => (editor.isEmpty ? placeholder : ""),
    }),
    StoryPhotoNode.configure({ familyId }),
    StoryLetterNode,
    Mention.configure({
      deleteTriggerWithBackspace: true,
      renderText: ({ node }) => String(node.attrs.label ?? ""),
      renderHTML: ({ node }) => [
        "span",
        mergeAttributes({ "data-type": "mention", class: "story-mention" }),
        String(node.attrs.label ?? ""),
      ],
      suggestion,
    }),
  ];
}
