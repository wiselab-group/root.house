"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PlaceNameFields {
  name: string;
  region: string;
  country: string;
}

const LABEL = "text-xs text-muted-foreground";

/** Name / region / country (controlled — an address search may fill them)
 *  and the description of a place being edited on the map. */
export function PlaceEditFields({
  values,
  onChange,
  description,
  nameError,
}: {
  values: PlaceNameFields;
  onChange: (next: PlaceNameFields) => void;
  description: string;
  nameError?: string;
}) {
  const tf = useTranslations("placeForm");
  const tc = useTranslations("common");
  const set =
    (key: keyof PlaceNameFields) => (e: { target: { value: string } }) =>
      onChange({ ...values, [key]: e.target.value });
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="place-name" className={LABEL}>
          {tc("name")}
        </Label>
        <Input
          id="place-name"
          name="name"
          value={values.name}
          onChange={set("name")}
          placeholder={tf("namePlaceholder")}
          required
        />
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="place-region" className={LABEL}>
            {tf("region")}
          </Label>
          <Input
            id="place-region"
            name="region"
            value={values.region}
            onChange={set("region")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="place-country" className={LABEL}>
            {tf("country")}
          </Label>
          <Input
            id="place-country"
            name="country"
            value={values.country}
            onChange={set("country")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="place-description" className={LABEL}>
          {tc("description")}
        </Label>
        <Textarea
          id="place-description"
          name="description"
          rows={2}
          defaultValue={description}
        />
      </div>
    </>
  );
}
