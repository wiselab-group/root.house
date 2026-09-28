"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  TextQuoteIcon,
} from "lucide-react";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { MenuButton, MenuDivider, menuSurfaceClass } from "./menu-parts";
import { LinkForm } from "./link-form";

/**
 * The little menu over selected text: bold, italic, chapter, quote, link.
 * On a phone it opens below the selection, out of the way of the system's
 * own copy/paste bubble above it. The link button swaps the row for an
 * address field (LinkForm).
 */
export function StoryBubbleMenu({ editor }: { editor: Editor }) {
  const t = useTranslations("storyForm");
  const coarse = useCoarsePointer();
  const [editingLink, setEditingLink] = useState(false);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      chapter: e.isActive("heading"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      href: String(e.getAttributes("link").href ?? ""),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: coarse ? "bottom" : "top",
        offset: 10,
        onHide: () => setEditingLink(false),
      }}
      className={menuSurfaceClass}
    >
      {editingLink ? (
        <LinkForm
          initial={active.href}
          onApply={(href) => {
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href })
              .run();
            setEditingLink(false);
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setEditingLink(false);
          }}
          onCancel={() => {
            setEditingLink(false);
            editor.commands.focus();
          }}
        />
      ) : (
        <div
          role="toolbar"
          aria-label={t("formatting")}
          className="flex items-center gap-0.5"
        >
          <MenuButton
            label={t("bold")}
            pressed={active.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon />
          </MenuButton>
          <MenuButton
            label={t("italic")}
            pressed={active.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon />
          </MenuButton>
          <MenuDivider />
          <MenuButton
            label={t("chapter")}
            pressed={active.chapter}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <HeadingIcon />
          </MenuButton>
          <MenuButton
            label={t("quote")}
            pressed={active.quote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <TextQuoteIcon />
          </MenuButton>
          <MenuDivider />
          <MenuButton
            label={t("link")}
            pressed={active.link}
            onClick={() => setEditingLink(true)}
          >
            <LinkIcon />
          </MenuButton>
        </div>
      )}
    </BubbleMenu>
  );
}
