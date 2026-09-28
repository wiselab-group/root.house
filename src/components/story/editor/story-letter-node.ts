import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { StoryLetterView } from "./story-letter-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storyLetter: {
      /** Starts an empty letter at the cursor, with the cursor inside it. */
      insertStoryLetter: () => ReturnType;
    };
  }
}

/**
 * The editor's side of story-doc.ts's StoryLetter: a sheet of paper holding
 * paragraphs, with a caption. Enter on an empty last line steps out of it
 * (ProseMirror's liftEmptyBlock, the same as leaving a quote).
 */
export const StoryLetterNode = Node.create({
  name: "storyLetter",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) => ({ "data-caption": attributes.caption }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-story-letter]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-story-letter": "" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryLetterView);
  },

  addCommands() {
    return {
      insertStoryLetter:
        () =>
        ({ chain, state }) => {
          const at = state.selection.from;
          return chain()
            .insertContent({
              type: this.name,
              attrs: { caption: "" },
              content: [{ type: "paragraph" }],
            })
            .focus(at + 1)
            .run();
        },
    };
  },
});
