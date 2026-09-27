import { useTranslations } from "next-intl";
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
  const t = useTranslations("profile");
  const filledFacts = facts.filter(
    (fact): fact is { label: string; value: string } => Boolean(fact.value),
  );
  if (!description && filledFacts.length === 0) return null;

  return (
    <section aria-label={t("about")} className="flex flex-col gap-8">
      {description && (
        <p className="max-w-[34ch] text-xl leading-snug font-normal tracking-[-0.01em] text-pretty whitespace-pre-wrap text-foreground sm:text-[1.75rem] sm:leading-[1.4]">
          {description}
        </p>
      )}
      {filledFacts.length > 0 && (
        <dl
          className={`${glassSurface} grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-12`}
        >
          {filledFacts.map((fact, index) => (
            <div
              key={fact.label}
              className={`-mt-px -ml-px flex min-w-0 flex-col gap-0.5 border-t border-l border-glass-edge px-4 py-3.5 ${cellSpan(
                index,
                filledFacts.length,
              )}`}
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
 * Every cell draws only its own top/left hairline, so every row has to be
 * full — a short last row leaves the lines stopping mid-card. Rows are
 * balanced instead of filled left to right: up to 4 facts sit in one row;
 * more go in rows of 3, and a remainder is never a lone cell (4 facts on 3
 * columns used to read as "3 on top, 1 stretched below" — user report):
 * 5 → 3+2, 7 → 3+2+2. Desktop uses a 12-column grid so any of those row
 * sizes divides evenly; phones keep 2 columns, an odd last cell spanning
 * both. Literal class names, for Tailwind's scanner.
 */
const SPAN_BY_ROW_SIZE: Record<number, string> = {
  1: "sm:col-span-12",
  2: "sm:col-span-6",
  3: "sm:col-span-4",
  4: "sm:col-span-3",
};

function rowSizes(count: number): number[] {
  if (count <= 4) return [count];
  const rows = Array<number>(Math.floor(count / 3)).fill(3);
  const rest = count % 3;
  if (rest === 2) rows.push(2);
  if (rest === 1) rows.splice(-1, 1, 2, 2);
  return rows;
}

function cellSpan(index: number, count: number): string {
  let start = 0;
  let wide = "";
  for (const size of rowSizes(count)) {
    if (index < start + size) {
      wide = SPAN_BY_ROW_SIZE[size];
      break;
    }
    start += size;
  }
  const phone = count % 2 === 1 && index === count - 1 ? "col-span-2" : "";
  return `${phone} ${wide}`;
}
