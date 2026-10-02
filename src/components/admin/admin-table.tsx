import type { ReactNode } from "react";

/**
 * Shared shell for the admin tables: heading, caption, and a table that
 * scrolls sideways inside its own box on narrow screens (the page itself
 * never scrolls horizontally).
 */
export function AdminTable({
  id,
  title,
  caption,
  footnote,
  head,
  children,
}: {
  id: string;
  title: string;
  caption: string;
  footnote?: string;
  /** Column headers, left to right; the first column is left-aligned,
   *  the rest are numbers/dates and align right. */
  head: string[];
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-heading text-xl font-medium">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {head.map((label, i) => (
                <th
                  key={label}
                  scope="col"
                  className={`px-4 py-3 font-medium whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular-nums">
            {children}
          </tbody>
        </table>
      </div>
      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </section>
  );
}

export function AdminCell({
  children,
  first = false,
  muted = false,
}: {
  children: ReactNode;
  first?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2.5 whitespace-nowrap ${first ? "text-left" : "text-right"} ${muted ? "text-muted-foreground" : ""}`}
    >
      {children}
    </td>
  );
}
