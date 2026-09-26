export type RelativeMode = "existing" | "new";

/** AddRelativeForm's «Уже есть в семье / Новый человек» switch — split out
 *  to keep that form under the 150-line component guideline. Posted as
 *  `mode` so addRelativeAction can refuse an «existing» submit with nobody
 *  picked instead of creating a nameless new Person. */
export function RelativeModeFields({
  mode,
  onModeChange,
  canPickExisting,
}: {
  mode: RelativeMode;
  onModeChange: (mode: RelativeMode) => void;
  canPickExisting: boolean;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name="mode"
          value="existing"
          checked={mode === "existing"}
          onChange={() => onModeChange("existing")}
          disabled={!canPickExisting}
        />
        Уже есть в семье
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name="mode"
          value="new"
          checked={mode === "new"}
          onChange={() => onModeChange("new")}
        />
        Новый человек
      </label>
    </div>
  );
}
