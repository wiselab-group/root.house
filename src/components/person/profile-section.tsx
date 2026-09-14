import type { ReactNode } from "react";

/**
 * One section of a page's single continuous flow — a text heading over its
 * content, separated from the next section by a border, not a Card.
 * Replaces the previous "every section is its own white Card" treatment
 * (first applied to the Person Profile: Основная информация / Семья / Фото /
 * Хронология / Истории all stacked as separate boxes) — a row of boxes reads
 * as a stack of admin panels, not one continuous page (impeccable design
 * pass, explicit user request: "убрать Card — единый поток"). Started on the
 * Person Profile page and its *-panel/*-gallery/*-timeline/*-stories
 * children, then reused as-is for the Event detail page and Family Settings
 * (with `description` and `tone="danger"` added for Settings' per-section
 * subline and Опасная зона) — one shared building block for "a page that is
 * a list of labeled sections", not a Person-only component despite living
 * under components/person.
 */
export function ProfileSection({
  title,
  description,
  tone = "default",
  children,
  className,
}: {
  title: string;
  /** Optional subline under the heading — e.g. Settings' per-section scope
   *  note ("видно всем участникам семьи"), which a plain heading alone
   *  used to need a whole CardDescription for. */
  description?: string;
  /** "danger" flags an irreversible-actions section (e.g. Settings' Опасная
   *  зона) — border and heading shift to --destructive instead of adding a
   *  one-off structure back in just for that one section. */
  tone?: "default" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-4 border-t pt-8 ${tone === "danger" ? "border-destructive/30" : "border-border"} ${className ?? ""}`}
    >
      <div className="flex flex-col gap-1">
        <h2
          className={`font-heading text-xl font-medium ${tone === "danger" ? "text-destructive" : ""}`}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
