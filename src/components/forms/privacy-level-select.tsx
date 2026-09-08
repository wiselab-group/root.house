import { Label } from "@/components/ui/label";
import type { PrivacyLevel } from "@/db/schema";

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  private: "Только я",
  family: "Участники семьи",
  public: "Публично",
};

/**
 * Shared "who can see this?" picker — inserted into every Person/Event/
 * Story/Media create (and Person edit) form so privacyLevel can actually be
 * set from the UI (see spec §17). Server-side default stays 'family' if
 * this field is ever omitted from a submission (see the relevant
 * CreateXData.privacyLevel repository defaults).
 *
 * Works both as an uncontrolled `<form>` field (name="privacyLevel", read
 * via formData on submit — the common case) and, when `value`/`onChange`
 * are given, as a controlled input for non-<form> flows like the photo
 * upload panel (which POSTs via fetch(), not a form submit).
 */
export function PrivacyLevelSelect({
  defaultValue = "family",
  value,
  onChange,
}: {
  defaultValue?: PrivacyLevel;
  value?: PrivacyLevel;
  onChange?: (value: PrivacyLevel) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="privacyLevel" className="text-xs text-muted-foreground">
        Кто может это видеть?
      </Label>
      <select
        id="privacyLevel"
        name="privacyLevel"
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={
          onChange ? (e) => onChange(e.target.value as PrivacyLevel) : undefined
        }
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {(Object.entries(PRIVACY_LABELS) as [PrivacyLevel, string][]).map(
          ([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
