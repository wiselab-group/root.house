import { Label } from "@/components/ui/label";
import type { PersonRecord } from "@/domain/person/person.service";

const GENDER_OPTIONS: Array<{ value: PersonRecord["gender"]; label: string }> =
  [
    { value: "unknown", label: "Не указан" },
    { value: "male", label: "Мужской" },
    { value: "female", label: "Женский" },
    { value: "other", label: "Другой" },
  ];

export function PersonGenderLivingFields({
  gender,
  isLiving,
  onIsLivingChange,
}: {
  gender?: PersonRecord["gender"];
  isLiving: boolean;
  onIsLivingChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gender">Пол</Label>
        <select
          id="gender"
          name="gender"
          defaultValue={gender ?? "unknown"}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <label htmlFor="isLiving" className="flex items-center gap-2 pt-6 text-sm">
        <input
          id="isLiving"
          name="isLiving"
          type="checkbox"
          checked={isLiving}
          onChange={(e) => onIsLivingChange(e.target.checked)}
          className="size-4"
        />
        Жив(а)
      </label>
    </div>
  );
}
