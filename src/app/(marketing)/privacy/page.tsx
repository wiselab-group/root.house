import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacyPolicy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Sections in reading order. A section is either one paragraph (`p1`) or,
 * with `items`, an optional lead paragraph followed by a list — each item
 * a message opening with a <b>label:</b>. Copy must describe what the code
 * actually does (EXIF kept on originals, analytics redaction, providers):
 * update it together with any change to data handling.
 */
const SECTIONS = [
  { id: "operator" },
  {
    id: "data",
    items: ["account", "archive", "photos", "technical", "analytics"],
  },
  { id: "purpose" },
  { id: "access", items: ["family", "links", "team"] },
  {
    id: "processors",
    lead: true,
    items: ["vercel", "neon", "google", "resend", "maptiler", "voice"],
  },
  { id: "cookies" },
  { id: "relatives" },
  { id: "retention" },
  { id: "rights" },
  { id: "security" },
  { id: "age" },
  { id: "changes" },
] as const;

type Section = (typeof SECTIONS)[number];

export default async function PrivacyPage() {
  const t = await getTranslations("privacyPolicy");

  const tags = {
    b: (chunks: ReactNode) => (
      <strong className="font-medium text-foreground">{chunks}</strong>
    ),
    email: () => (
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-medium text-foreground underline underline-offset-4 transition-colors duration-base ease-(--ease-reveal) hover:text-primary"
      >
        {CONTACT_EMAIL}
      </a>
    ),
  };

  // The key is assembled from SECTIONS' literal ids, so it's always a real
  // message — next-intl's typed keys just can't follow the template.
  const rich = (key: string) => t.rich(key as "intro", tags);

  function body(section: Section) {
    if (!("items" in section))
      return <p>{rich(`sections.${section.id}.p1`)}</p>;
    return (
      <>
        {"lead" in section && <p>{rich(`sections.${section.id}.p1`)}</p>}
        <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-branch">
          {section.items.map((item) => (
            <li key={item}>{rich(`sections.${section.id}.${item}`)}</li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-4">
        <h1 className="font-heading text-title font-medium text-balance">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("updated")}</p>
        <p className="text-lg text-pretty text-muted-foreground">
          {t("intro")}
        </p>
      </header>
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`privacy-${section.id}`}
          className="flex flex-col gap-3 leading-relaxed text-pretty text-muted-foreground"
        >
          <h2
            id={`privacy-${section.id}`}
            className="font-heading text-xl font-medium text-foreground"
          >
            {t(`sections.${section.id}.title`)}
          </h2>
          {body(section)}
        </section>
      ))}
    </article>
  );
}
