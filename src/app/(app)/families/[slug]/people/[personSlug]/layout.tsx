/**
 * Adds the @modal slot next to the profile: a soft navigation to /…/edit
 * from the profile is intercepted into an EditPanel over it
 * (@modal/(.)edit), while a hard load of /…/edit still renders the
 * standalone edit page (the slot falls back to default.tsx → nothing).
 */
export default function PersonLayout({
  children,
  modal,
}: LayoutProps<"/families/[slug]/people/[personSlug]">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
