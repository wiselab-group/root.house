import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonRecord } from "@/domain/person/person.service";

/** Name fields — split out to keep PersonForm under the 150-line limit. */
export function PersonNameFields({ person }: { person?: PersonRecord | null }) {
  const t = useTranslations("personForm");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">{t("firstName")}</Label>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={person?.firstName ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">{t("lastName")}</Label>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={person?.lastName ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="middleName">{t("middleName")}</Label>
        <Input
          id="middleName"
          name="middleName"
          defaultValue={person?.middleName ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="maidenName">{t("maidenName")}</Label>
        <Input
          id="maidenName"
          name="maidenName"
          defaultValue={person?.maidenName ?? ""}
        />
      </div>
    </div>
  );
}
