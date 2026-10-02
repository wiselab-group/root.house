import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** "By continuing, you agree to the privacy policy" — under both login and
 *  register, since a first Google sign-in on /login creates an account too. */
export async function PrivacyConsent() {
  const t = await getTranslations("privacyPolicy");
  return (
    <p className="text-center text-xs text-pretty text-muted-foreground">
      {t.rich("consent", {
        link: (chunks) => (
          <Link
            href="/privacy"
            className="underline underline-offset-4 transition-colors duration-base ease-(--ease-reveal) hover:text-foreground"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
