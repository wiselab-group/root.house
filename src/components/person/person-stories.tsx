import { getPersonStories } from "@/domain/story/story.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStoryForm } from "@/components/forms/add-story-form";
import { DeleteStoryButton } from "@/components/forms/delete-story-button";
import { CollapsibleForm } from "@/components/forms/collapsible-form";

/**
 * A Person's family stories/memories — server component, same pattern as
 * PersonFamilyPanel/PersonTimeline/PersonMediaGallery.
 */
export async function PersonStories({
  familyId,
  personId,
  canEdit,
}: {
  familyId: string;
  personId: string;
  canEdit: boolean;
}) {
  const stories = await getPersonStories(personId, familyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Истории</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Историй пока нет.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {stories.map((story) => (
              <li key={story.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h3 className="font-medium">{story.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{story.body}</p>
                {canEdit && (
                  <div className="mt-1">
                    <DeleteStoryButton familyId={familyId} personId={personId} storyId={story.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <CollapsibleForm triggerLabel="Добавить историю">
            <AddStoryForm familyId={familyId} personId={personId} />
          </CollapsibleForm>
        )}
      </CardContent>
    </Card>
  );
}
