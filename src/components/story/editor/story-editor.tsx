"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  parseStoryMarkdown,
  serializeStoryDoc,
} from "@/domain/story/story-markdown";
import { coerceStoryDoc } from "@/domain/story/story-doc-coerce";
import { storyEditorExtensions } from "./story-editor-extensions";
import { StoryBubbleMenu } from "./story-bubble-menu";
import { StoryInsertMenu } from "./story-insert-menu";
import { InlinePhotoPicker } from "./inline-photo-picker";
import { MentionPopup } from "./mention-popup";
import {
  useMentionSuggestion,
  type MentionPerson,
} from "./use-mention-suggestion";

/**
 * The story's text editor (Tiptap): `value`/`onChange` are the stored
 * Markdown (story-markdown.ts), so the autosave, the draft restore and the
 * form submit keep handling one string. Typing emits the new Markdown; a
 * `value` that didn't come from this editor (a restored draft) replaces
 * its content. Styled by `.story-editor` in globals.css to match the story
 * page's reading column — the first paragraph is the lead there too.
 */
export function StoryEditor({
  familyId,
  value,
  onChange,
  people,
  invalid,
}: {
  familyId: string;
  value: string;
  onChange: (markdown: string) => void;
  people: MentionPerson[];
  invalid?: boolean;
}) {
  const t = useTranslations("storyForm");
  const mention = useMentionSuggestion(people);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const emitted = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // Rendered on the client only: the server has no DOM to measure.
    immediatelyRender: false,
    extensions: storyEditorExtensions({
      familyId,
      placeholder: t("bodyPlaceholder"),
      suggestion: mention.suggestion,
    }),
    content: parseStoryMarkdown(value),
    editorProps: {
      attributes: {
        id: "body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": t("body"),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor: e }) => {
      const markdown = serializeStoryDoc(coerceStoryDoc(e.getJSON()));
      emitted.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(parseStoryMarkdown(value), {
      emitUpdate: false,
    });
  }, [editor, value]);

  return (
    <div
      className="story-editor relative"
      style={
        {
          "--story-chapter-label": `"${t("chapterLabel")}"`,
        } as React.CSSProperties
      }
    >
      <EditorContent editor={editor} />
      {editor && (
        <>
          <StoryBubbleMenu editor={editor} />
          <StoryInsertMenu
            editor={editor}
            onPickPhoto={() => setPhotoPickerOpen(true)}
          />
        </>
      )}
      <MentionPopup
        familyId={familyId}
        state={mention.state}
        onHover={mention.setIndex}
      />
      <InlinePhotoPicker
        familyId={familyId}
        open={photoPickerOpen}
        onOpenChange={setPhotoPickerOpen}
        onPick={(photoId) => {
          setPhotoPickerOpen(false);
          editor?.chain().focus().insertStoryPhoto(photoId).run();
        }}
      />
      <p className="mt-6 text-sm text-muted-foreground">{t("editorHint")}</p>
    </div>
  );
}
