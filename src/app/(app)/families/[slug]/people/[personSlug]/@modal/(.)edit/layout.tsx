import { EditPanel } from "@/components/edit-panel/edit-panel";

/**
 * The panel lives in the layout, above this route's loading boundary, so it
 * slides in once on click and stays put while loading.tsx → page.tsx swap
 * inside it — instead of animating in twice.
 */
export default function EditPersonPanelLayout({
  children,
}: LayoutProps<"/families/[slug]/people/[personSlug]/edit">) {
  return <EditPanel>{children}</EditPanel>;
}
