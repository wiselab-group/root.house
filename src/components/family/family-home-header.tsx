import { HeroMeta, type HeroMetaItem } from "@/components/hero/hero-meta";

/**
 * Family Home's title block — deliberately NOT a photo hero like the Person
 * Profile's (user: Family Home is a main hub page, a portrait hero — tried
 * as a mosaic of portraits — read as "another profile"). Just the family's
 * name set large in the serif heading face (Lora, as before the dark
 * restyle — user request), its description, and
 * the at-a-glance counts; the tree card right below is the page's lead.
 */
export function FamilyHomeHeader({
  name,
  description,
  meta,
}: {
  name: string;
  description: string | null;
  meta: HeroMetaItem[];
}) {
  return (
    <header className="flex flex-col gap-4">
      <h1 className="font-heading text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
        {name}
      </h1>
      {description && (
        <p className="max-w-prose text-lg text-foreground/70">{description}</p>
      )}
      <HeroMeta items={meta} />
    </header>
  );
}
