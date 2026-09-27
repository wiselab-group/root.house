import { GlassPill, PanelFrame } from "./panel-frame";

const PEOPLE = ["Vera", "Ivan", "Paul"];

/** A story page: serif title, who told it, a drop-capped first paragraph,
 *  and the people it's linked to. */
export function StoryPanel() {
  return (
    <PanelFrame className="flex flex-col justify-center gap-[5%] px-[10%]">
      <span className="text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] tracking-[0.14em] text-primary uppercase">
        Story
      </span>
      <p className="font-heading text-[clamp(1.25rem,0.6rem+4cqw,2.5rem)] leading-tight font-medium">
        The winter of 1947
      </p>
      <p className="text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] text-muted-foreground">
        Told by Margaret · 3 min read
      </p>
      <p className="text-[clamp(0.6875rem,0.5rem+1.05cqw,1rem)] leading-relaxed text-foreground/90 first-letter:float-left first-letter:mr-[0.12em] first-letter:font-heading first-letter:text-[3.2em] first-letter:leading-[0.8] first-letter:text-primary">
        Mum always said the lake froze so hard that winter that the whole
        village walked across it to church. She was sixteen, and it was the
        first time she saw my father — on the ice, carrying someone else&apos;s
        skates.
      </p>
      <div className="flex flex-wrap gap-2">
        {PEOPLE.map((name) => (
          <GlassPill key={name}>
            <span className="flex size-[1.4em] items-center justify-center rounded-full bg-branch text-[0.8em]">
              {name[0]}
            </span>
            {name}
          </GlassPill>
        ))}
      </div>
    </PanelFrame>
  );
}
