import { EditPanel } from "@/components/edit-panel/edit-panel";

/** The panel sits above the loading boundary so it slides in once — see
 *  people/[personSlug]/@modal/(.)edit/layout.tsx. */
export default function EditEventPanelLayout({
  children,
}: LayoutProps<"/families/[slug]/events/[eventId]/edit">) {
  return <EditPanel>{children}</EditPanel>;
}
