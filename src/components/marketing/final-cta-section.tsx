import { LinkButton } from "@/components/ui/link-button";

export function FinalCtaSection() {
  return (
    <section className="bg-primary/5 px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 className="font-heading text-3xl font-medium text-balance sm:text-4xl">
          Someone in your family remembers the story. Give that story a place to
          live.
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/register" size="lg">
            Start your family story →
          </LinkButton>
          <LinkButton href="/register" variant="ghost" size="lg">
            Explore the family tree
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
