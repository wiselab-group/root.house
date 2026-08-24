import { Label } from "@/components/ui/label";
import type { PlaceRecord } from "@/domain/place/place.service";

/**
 * A Place picker backed by the family's Place list (see /places) — plain
 * <select>, not a search/combobox, since a family's place list is expected
 * to stay small (tens, not hundreds, of entries).
 */
export function PlaceSelect({
  id,
  name,
  label,
  places,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  places: PlaceRecord[];
  defaultValue?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Не указано</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </select>
    </div>
  );
}
