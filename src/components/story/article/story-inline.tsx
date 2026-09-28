import Link from "next/link";
import type { StoryInline, StoryMark } from "@/domain/story/story-doc";
import type { StoryRefs } from "./story-refs";

/** A person named in the story: the tree's sage underline — sage means
 *  «this is a person» everywhere in the app. */
const MENTION_CLASS =
  "rounded-sm text-foreground underline decoration-tree-accent/70 decoration-[1.5px] underline-offset-[5px] transition-[text-decoration-color] duration-base ease-(--ease-reveal) outline-none hover:decoration-tree-accent focus-visible:ring-3 focus-visible:ring-ring/50";

const LINK_CLASS =
  "rounded-sm underline decoration-foreground/35 underline-offset-4 transition-[text-decoration-color] duration-base ease-(--ease-reveal) outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Inline story content: text with bold/italic/links, line breaks, and
 *  mentions linked to the person's profile (plain text if they're gone). */
export function StoryInlineContent({
  content,
  refs,
}: {
  content: StoryInline[];
  refs: StoryRefs;
}) {
  return content.map((node, index) => {
    if (node.type === "hardBreak") return <br key={index} />;
    if (node.type === "mention") {
      const person = refs.people[node.attrs.id];
      return person ? (
        <Link key={index} href={person.href} className={MENTION_CLASS}>
          {node.attrs.label}
        </Link>
      ) : (
        <span key={index}>{node.attrs.label}</span>
      );
    }
    return (
      <Marked key={index} marks={node.marks ?? []}>
        {node.text}
      </Marked>
    );
  });
}

function Marked({
  marks,
  children,
}: {
  marks: StoryMark[];
  children: React.ReactNode;
}) {
  return marks.reduceRight<React.ReactNode>((inner, mark) => {
    if (mark.type === "bold") {
      return <strong className="font-semibold text-foreground">{inner}</strong>;
    }
    if (mark.type === "italic") return <em>{inner}</em>;
    return (
      <a
        href={mark.attrs.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={LINK_CLASS}
      >
        {inner}
      </a>
    );
  }, children);
}
