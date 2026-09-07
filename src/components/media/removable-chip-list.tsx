import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Removable chip list of already-selected {id, name} items — shared by PersonMultiCombobox and AlbumMultiCombobox to render what's picked so far. */
export function RemovableChipList({
  items,
  onRemove,
}: {
  items: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
          {item.name}
          <button
            type="button"
            aria-label={`Убрать ${item.name}`}
            onClick={() => onRemove(item.id)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
