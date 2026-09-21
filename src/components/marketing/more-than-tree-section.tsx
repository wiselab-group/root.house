import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { ProfileMockup } from "@/components/marketing/mockups/profile-mockup";

export function MoreThanTreeSection() {
  return (
    <section className="bg-muted/40 px-6 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-2">
        <MarketingSectionHeading
          align="left"
          title="A person is more than a name and two dates."
          subcopy="Every profile holds what actually made them who they were — photos, the stories people tell about them, the events that shaped their life, and how they connect to everyone else in the family."
        />
        <ProfileMockup />
      </div>
    </section>
  );
}
