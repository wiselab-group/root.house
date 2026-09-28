import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { StoryPhotoView } from "./story-photo-view";

export interface StoryPhotoOptions {
  /** For the photo's URL in the node view (mediaUrl). */
  familyId: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storyPhoto: {
      /** Places an archive photo at the cursor (replacing an empty line). */
      insertStoryPhoto: (mediaId: string) => ReturnType;
    };
  }
}

/** The editor's side of story-doc.ts's StoryPhoto: one atomic block, its
 *  caption and width edited in the node view (StoryPhotoView). */
export const StoryPhotoNode = Node.create<StoryPhotoOptions>({
  name: "storyPhoto",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { familyId: "" };
  },

  addAttributes() {
    return {
      mediaId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-media-id") ?? "",
        renderHTML: (attributes) => ({ "data-media-id": attributes.mediaId }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) => ({ "data-caption": attributes.caption }),
      },
      wide: {
        default: false,
        parseHTML: (element) => element.hasAttribute("data-wide"),
        renderHTML: (attributes) =>
          attributes.wide ? { "data-wide": "" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-story-photo]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-story-photo": "" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryPhotoView);
  },

  addCommands() {
    return {
      insertStoryPhoto:
        (mediaId) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { mediaId, caption: "", wide: false },
          }),
    };
  },
});
