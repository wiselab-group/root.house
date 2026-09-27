import { EventEditPanelContent } from "../../edit/panel-content";

/** /events/[id]/edit intercepted from the event page — inside the
 *  EditPanel from ./layout.tsx. */
export default async function EditEventPanelPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  return <EventEditPanelContent slug={slug} eventId={eventId} />;
}
