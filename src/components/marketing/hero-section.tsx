import { LinkButton } from "@/components/ui/link-button";
import { HeroScrollStack } from "@/components/marketing/hero-scroll-stack/hero-scroll-stack";

/**
 * The scroll-stack sits outside the `overflow-hidden` decorative-wash
 * wrapper below — `overflow-hidden` on an ancestor creates a scroll
 * container that would clip the stack's own `position: sticky` behavior.
 */
export function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden px-6 pt-16 pb-8 sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-primary)_0%,transparent_70%)] opacity-[0.07]"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-medium tracking-[0.14em] text-primary">
            ROOT HOUSE
          </span>
          <h1 className="font-heading text-4xl font-medium text-balance sm:text-5xl">
            Your family has a story. Give it a place to live.
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            Root house is a private home for the people, memories, and photos
            that make your family yours — one place, not scattered across old
            drives and group chats.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg">
              Start your family story →
            </LinkButton>
            <LinkButton href="#hero-carousel" variant="ghost" size="lg">
              See how it works
            </LinkButton>
          </div>
        </div>
      </section>

      <HeroScrollStack />
    </>
  );
}
