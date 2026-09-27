/**
 * Adds the @modal slot next to the event page: a soft navigation to
 * /…/edit from it is intercepted into an EditPanel over the event
 * (@modal/(.)edit), while a hard load of /…/edit still renders the
 * standalone edit page (the slot falls back to default.tsx → nothing).
 * Same pattern as people/[personSlug]/layout.tsx.
 */
export default function EventLayout({
  children,
  modal,
}: LayoutProps<"/families/[slug]/events/[eventId]">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
