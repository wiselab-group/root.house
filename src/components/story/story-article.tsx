import type { StoryLayout } from "@/domain/story/story-layout";
import { StoryBlockView } from "./article/story-blocks";
import { StoryInlineContent } from "./article/story-inline";
import type { StoryRefs } from "./article/story-refs";

/**
 * The Story's text as a reading column: the lead in large type, chapters as
 * numbered headings (anchor targets for StoryChaptersNav), paragraphs at a
 * comfortable 18px/1.7, and the rich blocks the editor can place — quotes,
 * lists, photos, letters (article/story-blocks.tsx). The editor's writing
 * column (StoryEditor) is set the same way, so text reads as it was written.
 *
 * Every block sits in a `display: contents` wrapper named like the
 * narration script's blocks ("lead", `b${index}`, story-narration.ts), so
 * the «Слушать» player can light up the one being read without the
 * wrapper changing the layout.
 */
export function StoryArticle({
  layout,
  refs,
}: {
  layout: StoryLayout;
  refs: StoryRefs;
}) {
  return (
    <article className="mx-auto flex max-w-176 flex-col gap-7 px-4 pt-12 pb-10 sm:px-8 sm:pt-16">
      {layout.lead && (
        <div data-narration-block="lead" className="contents">
          <p className="max-w-[34ch] text-2xl leading-snug tracking-[-0.012em] text-pretty sm:text-[1.9rem] sm:leading-[1.42]">
            <StoryInlineContent content={layout.lead} refs={refs} />
          </p>
        </div>
      )}
      {layout.blocks.map((block, index) => (
        <div
          key={block.type === "chapter" ? block.id : index}
          data-narration-block={`b${index}`}
          className="contents"
        >
          <StoryBlockView block={block} refs={refs} />
        </div>
      ))}
    </article>
  );
}
