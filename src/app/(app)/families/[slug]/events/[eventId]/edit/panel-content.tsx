import { getLocale } from "next-intl/server";
import { loadEventEdit } from "@/lib/load-event-edit";
import { EditEventForm } from "@/components/forms/edit-event-form";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";

/**
 * The event edit panel's contents — shared by the intercepted
 * @modal/(.)edit route and the hard-load edit/page.tsx.
 */
export async function EventEditPanelContent({
  slug,
  eventId,
}: {
  slug: string;
  eventId: string;
}) {
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
