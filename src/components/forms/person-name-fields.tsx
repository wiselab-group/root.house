import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonRecord } from "@/domain/person/person.service";

/** Name/nickname fields — split out to keep PersonForm under the 150-line limit. */
export function PersonNameFields({ person }: { person?: PersonRecord | null }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">Имя</Label>
        <Input id="firstName" name="firstName" defaultValue={person?.firstName ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">Фамилия</Label>
        <Input id="lastName" name="lastName" defaultValue={person?.lastName ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="middleName">Отчество</Label>
        <Input id="middleName" name="middleName" defaultValue={person?.middleName ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="maidenName">Девичья фамилия</Label>
        <Input id="maidenName" name="maidenName" defaultValue={person?.maidenName ?? ""} />
      </div>
      <div className="flex flex-col gap-2 col-span-2">
        <Label htmlFor="nickname">Прозвище</Label>
        <Input id="nickname" name="nickname" defaultValue={person?.nickname ?? ""} />
      </div>
    </div>
  );
}
