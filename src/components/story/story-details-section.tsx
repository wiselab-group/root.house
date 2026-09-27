"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PersonMultiCombobox } from "@/components/media/person-multi-combobox";
import { PrivacyLevelSelect } from "@/components/forms/privacy-level-select";
import type { StoryPhotoChoice } from "@/actions/story.actions";
import type { PrivacyLevel } from "@/db/schema";
import { StoryPhotosField } from "./story-photos-field";

/** EditStoryForm's «Люди, фото и доступ» block under the text — not
 *  autosaved, submitted with the form as `personId`/`privacyLevel`/
 *  `photoId` fields. */
export function StoryDetailsSection({
  familyId,
  people,
  photos,
  privacyLevel,
}: {
  familyId: string;
  people: { id: string; name: string }[];
  photos: StoryPhotoChoice[];
  privacyLevel: PrivacyLevel;
}) {
  const t = useTranslations("storyForm");
  const [selectedPeople, setSelectedPeople] = useState(people);
  const [selectedPhotos, setSelectedPhotos] = useState(photos);

  return (
    <section
      aria-labelledby="story-details"
      className="mt-8 flex flex-col gap-5 border-t border-border pt-8"
    >
      <h2
        id="story-details"
        className="text-xs tracking-[0.12em] text-foreground/45 uppercase"
      >
        {t("details")}
      </h2>
      <PersonMultiCombobox
        familyId={familyId}
        label={t("people")}
        value={selectedPeople}
        onChange={setSelectedPeople}
      />
      {selectedPeople.map((person) => (
        <input
          key={person.id}
          type="hidden"
          name="personId"
          value={person.id}
        />
      ))}
      <PrivacyLevelSelect defaultValue={privacyLevel} />
      <StoryPhotosField
        familyId={familyId}
        value={selectedPhotos}
        onChange={setSelectedPhotos}
      />
    </section>
  );
}
