import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "New person" name + placeholder fields for AddRelativeForm's "new" mode —
 *  split out to keep the parent under the project's 150-line component
 *  guideline. */
export function NewRelativeFields({ kind }: { kind: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${kind}-newFirstName`}
            className="text-xs text-muted-foreground"
          >
            Имя
          </Label>
          <Input id={`${kind}-newFirstName`} name="newFirstName" />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${kind}-newLastName`}
            className="text-xs text-muted-foreground"
          >
            Фамилия
          </Label>
          <Input id={`${kind}-newLastName`} name="newLastName" />
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox name="isPlaceholder" />
        Имя неизвестно — создать запись-заглушку
      </label>
    </div>
  );
}
