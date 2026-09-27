import { getLocale } from "next-intl/server";
import { loadEventEdit } from "@/lib/load-event-edit";
import { EditEventForm } from "@/components/forms/edit-event-form";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";

/**
 * /events/[id]/edit intercepted from the event page — the same form as the
 * standalone edit page (../../edit/page.tsx), inside the EditPanel from
 * ./layout.tsx.
 */
export default async function EditEventPanelPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  const data = await loadEventEdit(slug, eventId, await getLocale());
  if (!data) return null;
  const { familyId, event, participants, places } = data;

  return (
    <>
      <EditPanelHeader title={event.title} />
      <EditPanelBody>
        <EditEventForm
          familyId={familyId}
          event={event}
          participants={participants.map((p) => ({
            personId: p.personId,
            name: p.name,
            role: p.role,
          }))}
          places={places}
        />
      </EditPanelBody>
    </>
  );
}
