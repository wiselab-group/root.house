import { useTranslations } from "next-intl";
import { Link2, Lock, MailPlus, Users } from "lucide-react";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

/** Only real, documented capabilities (docs/architecture.md § Roles,
 *  Privacy, Invitations; share links) — no invented security claims. */
const FACTS = [
  { id: "private", icon: Lock },
  { id: "roles", icon: Users },
  { id: "invite", icon: MailPlus },
  { id: "share", icon: Link2 },
] as const;

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

/** 09 — Who owns it? The family does: a closed space, people let in by
 *  invitation with the access their role gives, sharing only by choice. */
export function PrivacySection() {
  const t = useTranslations("landing.privacy");
  const tr = useTranslations("roles");
  const family = useDemoFamily();
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="scroll-mt-8 px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 border-y border-border py-12 lg:gap-16 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <h2
              id="privacy-title"
              className="font-heading text-title font-medium text-balance"
            >
              {t("title")}
            </h2>
            <p className="max-w-lg text-balance text-muted-foreground sm:text-lg">
              {t("lead")}
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-3xl border border-border bg-card p-4">
            <span className="flex items-center gap-2 px-2 pt-1 pb-3 text-sm text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" /> {t("space")}
            </span>
            <h3 className="sr-only">{t("membersTitle")}</h3>
            <ul className="flex flex-col">
              {MEMBERS.map(({ id, role }) => (
                <li
                  key={id}
                  className="flex items-center gap-3 border-t border-border px-2 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
                  >
                    {family[id].name[0]}
                  </span>
                  <span className="flex-1 text-foreground">
                    {family[id].name}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {tr(role)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ id, icon: Icon }) => (
            <li key={id} className="flex flex-col gap-2">
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
                strokeWidth={1.5}
              />
              <span className="font-medium text-foreground">
                {t(`facts.${id}.title`)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t(`facts.${id}.body`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
