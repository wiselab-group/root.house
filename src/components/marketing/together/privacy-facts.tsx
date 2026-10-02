import { useTranslations } from "next-intl";
import { Link2, Lock, MailPlus, Users } from "lucide-react";

const FACTS = [
  { id: "private", icon: Lock },
  { id: "roles", icon: Users },
  { id: "invite", icon: MailPlus },
  { id: "share", icon: Link2 },
] as const;

/** Four plain facts about who sees what — no invented security claims. */
export function PrivacyFacts() {
  const t = useTranslations("landing.privacy.facts");
  return (
    <ul className="grid gap-8 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
      {FACTS.map(({ id, icon: Icon }) => (
        <li key={id} className="flex flex-col gap-2">
          <Icon
            className="size-5 text-muted-foreground"
            aria-hidden="true"
            strokeWidth={1.5}
          />
          <span className="font-medium text-foreground">
            {t(`${id}.title`)}
          </span>
          <span className="text-sm text-muted-foreground">
            {t(`${id}.body`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
