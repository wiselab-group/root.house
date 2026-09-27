import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PersonRecord } from "@/domain/person/person.service";

/** Religion/nationality/description — split out of PersonForm to keep it under CLAUDE.md's 150-line ceiling. */
export function PersonMiscFields({ person }: { person?: PersonRecord | null }) {
  const t = useTranslations("personForm");
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="religion">{t("religion")}</Label>
          <Input
            id="religion"
            name="religion"
            defaultValue={person?.religion ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nationality">{t("nationality")}</Label>
          <Input
            id="nationality"
            name="nationality"
            defaultValue={person?.nationality ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={person?.description ?? ""}
        />
      </div>
    </>
  );
}
