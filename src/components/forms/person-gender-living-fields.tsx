import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { PersonRecord } from "@/domain/person/person.service";

const GENDER_OPTIONS = [
  { value: "unknown", labelKey: "genderUnknown" },
  { value: "male", labelKey: "genderMale" },
  { value: "female", labelKey: "genderFemale" },
] as const satisfies ReadonlyArray<{
  value: PersonRecord["gender"];
  labelKey: string;
}>;

export function PersonGenderLivingFields({
  gender,
  onGenderChange,
  isLiving,
  onIsLivingChange,
}: {
  gender: PersonRecord["gender"];
  /** Controlled: the name fields hide «Девичья фамилия» for men. */
  onGenderChange: (value: PersonRecord["gender"]) => void;
  isLiving: boolean;
  onIsLivingChange: (value: boolean) => void;
}) {
  const t = useTranslations("personForm");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gender">{t("gender")}</Label>
        <NativeSelect
          id="gender"
          name="gender"
          value={gender}
          onChange={(event) =>
            onGenderChange(event.target.value as PersonRecord["gender"])
          }
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-2.5 sm:pt-6">
        <Switch
          id="isLiving"
          name="isLiving"
          size="lg"
          checked={isLiving}
          onCheckedChange={onIsLivingChange}
        />
        <Label
          htmlFor="isLiving"
          className="cursor-pointer text-sm font-normal"
        >
          {t("living")}
        </Label>
      </div>
    </div>
  );
}
