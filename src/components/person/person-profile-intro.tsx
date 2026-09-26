import { glassSurface } from "@/components/hero/glass";

/**
 * The Person Profile's opening block, right under the hero: the person's own
 * description as lead prose, then their facts (religion, birthplace, ...) as
 * one quiet definition list — replacing two separate headed sections
 * ("Основная информация" + "Описание") that set the most human content on
 * the page in the same small text-sm as form labels, under database-speak
 * headings (impeccable "bolder" pass). No heading of its own: this is the
 * page's "about", read straight after the name, not one section among many.
 *
 * On the dark photo-backdrop profile (2026-09-24 redesign) the description
 * is set as a large lead paragraph and the facts as one frosted strip — the
 * reference's «паспорт» row — instead of a bare two-column list.
 *
 * Renders nothing when there's neither a description nor any fact.
 */
export function PersonProfileIntro({
  description,
  facts,
}: {
  description: string | null;
  facts: { label: string; value: string | null | undefined }[];
}) {
  const filledFacts = facts.filter(
    (fact): fact is { label: string; value: string } => Boolean(fact.value),
  );
  if (!description && filledFacts.length === 0) return null;

  return (
    <section aria-label="О человеке" className="flex flex-col gap-8">
      {description && (
        <p className="max-w-[34ch] text-xl leading-snug font-normal tracking-[-0.01em] text-pretty whitespace-pre-wrap text-foreground sm:text-[1.75rem] sm:leading-[1.4]">
          {description}
        </p>
      )}
      {filledFacts.length > 0 && (
        <dl
          className={`${glassSurface} grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-3`}
        >
          {filledFacts.map((fact, index) => (
            <div
              key={fact.label}
              className={`-mt-px -ml-px flex min-w-0 flex-col gap-0.5 border-t border-l border-glass-edge px-4 py-3.5 ${
                index === filledFacts.length - 1
                  ? lastCellSpan(filledFacts.length)
                  : ""
              }`}
            >
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="text-[0.95rem] wrap-break-word text-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * Every cell draws only its own top/left hairline, so a short last row
 * (4 facts on 3 columns) left the lines stopping mid-card — a stair-step.
 * The last cell stretches over the row's empty columns instead, so every
 * line runs the full width. Literal class names, for Tailwind's scanner.
 */
function lastCellSpan(count: number): string {
  const phone = count % 2 === 1 ? "col-span-2" : "";
  const emptyWide = (3 - (count % 3)) % 3;
  const wide = ["sm:col-span-1", "sm:col-span-2", "sm:col-span-3"][emptyWide];
  return `${phone} ${wide}`;
}
