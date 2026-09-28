"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import {
  HeadingIcon,
  ImageIcon,
  ListIcon,
  PlusIcon,
  ScrollTextIcon,
  TextQuoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuButton, MenuDivider, menuSurfaceClass } from "./menu-parts";

/**
 * «+» beside the caret on an empty line: opens into a row of what can be
 * placed there — a photo from the archive, a chapter, a quote, a letter, a
 * list. Not on the story's very first line (that's the lead — just start
 * writing) and not inside a quote/list/letter.
 */
export function StoryInsertMenu({
  editor,
  onPickPhoto,
}: {
  editor: Editor;
  onPickPhoto: () => void;
}) {
  const t = useTranslations("storyForm");
  const [open, setOpen] = useState(false);
  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <FloatingMenu
      editor={editor}
      options={{
        placement: "right",
        offset: 12,
        onHide: () => setOpen(false),
      }}
      shouldShow={({ editor: e, state }) => {
        const { $from, empty } = state.selection;
        return (
          e.isEditable &&
          e.view.hasFocus() &&
          empty &&
          !e.isEmpty &&
          $from.depth === 1 &&
          $from.parent.type.name === "paragraph" &&
          $from.parent.content.size === 0
        );
      }}
      className={cn(menuSurfaceClass, "gap-0.5")}
    >
      <MenuButton
        label={open ? t("insertClose") : t("insertOpen")}
        pressed={open}
        onClick={() => setOpen((value) => !value)}
      >
        <PlusIcon
          className={cn(
            "transition-transform duration-base ease-(--ease-reveal)",
            open && "rotate-45",
          )}
        />
      </MenuButton>
      {open && (
        <div
          role="toolbar"
          aria-label={t("insertOpen")}
          className="flex animate-in items-center gap-0.5 duration-base fade-in-0 slide-in-from-left-2"
        >
          <MenuDivider />
          <MenuButton label={t("insertPhoto")} onClick={() => run(onPickPhoto)}>
            <ImageIcon />
          </MenuButton>
          <MenuButton
            label={t("chapter")}
            onClick={() =>
              run(() => editor.chain().focus().setHeading({ level: 2 }).run())
            }
          >
            <HeadingIcon />
          </MenuButton>
          <MenuButton
            label={t("quote")}
            onClick={() =>
              run(() => editor.chain().focus().setBlockquote().run())
            }
          >
            <TextQuoteIcon />
          </MenuButton>
          <MenuButton
            label={t("insertLetter")}
            onClick={() =>
              run(() => editor.chain().focus().insertStoryLetter().run())
            }
          >
            <ScrollTextIcon />
          </MenuButton>
          <MenuButton
            label={t("insertList")}
            onClick={() =>
              run(() => editor.chain().focus().toggleBulletList().run())
            }
          >
            <ListIcon />
          </MenuButton>
        </div>
      )}
    </FloatingMenu>
  );
}
