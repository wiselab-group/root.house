import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PersonRecord } from "@/domain/person/person.service";

const GENDER_OPTIONS: Array<{ value: PersonRecord["gender"]; label: string }> =
  [
    { value: "unknown", label: "Не указан" },
    { value: "male", label: "Мужской" },
    { value: "female", label: "Женский" },
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
      <div className="flex items-center gap-2.5 pt-6">
        <Switch
          id="isLiving"
          name="isLiving"
          size="lg"
          checked={isLiving}
          onCheckedChange={onIsLivingChange}
        />
        <Label htmlFor="isLiving" className="cursor-pointer text-sm font-normal">
          Жив(а)
        </Label>
      </div>
    </div>
  );
}
