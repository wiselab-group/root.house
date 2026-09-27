import { useTranslations } from "next-intl";
import { Lock, MailPlus, Users } from "lucide-react";

/** Only real, documented capabilities (docs/architecture.md § Roles,
 *  Privacy, Invitations) — no invented security claims. */
const FACTS = [
  { icon: Lock, title: "privateTitle", description: "privateBody" },
  { icon: Users, title: "rolesTitle", description: "rolesBody" },
  { icon: MailPlus, title: "inviteTitle", description: "inviteBody" },
] as const;

/** One quiet band rather than three cards: privacy is part of the promise,
 *  not a feature grid. */
export function PrivacySection() {
  const t = useTranslations("landing");
  return (
    <section aria-labelledby="privacy-title" className="px-6 py-section">
      <div className="mx-auto grid max-w-6xl gap-10 border-y border-border py-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2
          id="privacy-title"
          className="font-heading text-title font-medium text-balance"
        >
          {t("privacyTitle")}
        </h2>
        <ul className="grid gap-8 sm:grid-cols-3">
          {FACTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col gap-2">
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
                strokeWidth={1.5}
              />
              <span className="font-medium text-foreground">{t(title)}</span>
              <span className="text-sm text-muted-foreground">
                {t(description)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
