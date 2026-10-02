import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

/** The demo family as members of its archive, one per real role. */
const MEMBERS: readonly {
  id: DemoPersonId;
  role: "owner" | "editor" | "contributor" | "viewer";
}[] = [
  { id: "owen", role: "owner" },
  { id: "margaret", role: "editor" },
  { id: "paul", role: "contributor" },
  { id: "lily", role: "viewer" },
];

/** Who's in the archive and what each may do — role names straight from
 *  the app's own `roles.*` messages. */
export function MembersCard() {
  const t = useTranslations("landing.privacy");
  const tr = useTranslations("roles");
  const family = useDemoFamily();
  return (
    <div className="flex flex-col gap-3 md:pt-1">
      <h3 className="flex items-center gap-2 px-1 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        <Lock className="size-3.5" aria-hidden="true" /> {t("space")}
      </h3>
      <ul className="flex flex-col rounded-2xl border border-border bg-card/60 px-3">
        {MEMBERS.map(({ id, role }) => (
          <li
            key={id}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
            >
              {family[id].name[0]}
            </span>
            <span className="flex-1 text-sm text-foreground">
              {family[id].name}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
              {tr(role)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
