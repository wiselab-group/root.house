import type { ReactNode } from "react";

/**
 * One section of the Person Profile's single continuous flow — a text
 * heading over its content, separated from the next section by a border,
 * not a Card. Replaces the previous "every section is its own white Card"
 * treatment (Основная информация / Семья / Фото / Хронология / Истории all
 * stacked as separate boxes) — six boxes in a row read as a stack of admin
 * panels, not one person's profile page (impeccable design pass, explicit
 * user request: "убрать Card — единый поток"). Used by the profile page
 * itself for its two inline sections (Основная информация/Описание) and by
 * every *-panel/*-gallery/*-timeline/*-stories component below it, so the
 * whole page reads as one rhythm rather than the shell and its children
 * disagreeing on how a section looks.
 */
export function ProfileSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-4 border-t border-border pt-8 ${className ?? ""}`}
    >
      <h2 className="font-heading text-xl font-medium">{title}</h2>
      {children}
    </section>
  );
}
