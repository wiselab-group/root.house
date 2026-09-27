import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { PrivacyLevel } from "@/db/schema";

const PRIVACY_LEVELS: PrivacyLevel[] = ["private", "family", "public"];

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
  const t = useTranslations("privacy");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="privacyLevel" className="text-xs text-muted-foreground">
        {t("question")}
      </Label>
      <NativeSelect
        id="privacyLevel"
        name="privacyLevel"
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={
          onChange ? (e) => onChange(e.target.value as PrivacyLevel) : undefined
        }
      >
        {PRIVACY_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t(level)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
