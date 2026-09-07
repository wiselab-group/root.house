"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { RemovableChipList } from "./removable-chip-list";

/**
 * Multi-select for tagging a photo with albums at upload time. Unlike
 * PersonMultiCombobox (search-as-you-type against potentially hundreds of
 * people via a server action), a family's album list is small and already
 * loaded on the page — no async search needed, so this is a plain
 * checkbox dropdown menu (DropdownMenuCheckboxItem already keeps the menu
 * open across picks) rather than a Combobox. Selected albums render as the
 * same removable chip list PersonMultiCombobox uses.
 */
export function AlbumMultiCombobox({
  albums,
  value,
  onChange,
}: {
  albums: { id: string; name: string }[];
  value: { id: string; name: string }[];
  onChange: (albums: { id: string; name: string }[]) => void;
}) {
  function toggle(album: { id: string; name: string }, checked: boolean) {
    onChange(
      checked
        ? [...value, album]
        : value.filter((selected) => selected.id !== album.id),
    );
  }

  function remove(id: string) {
    onChange(value.filter((album) => album.id !== id));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Альбомы (необязательно)</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
              disabled={albums.length === 0}
            />
          }
        >
          {albums.length === 0
            ? "В семье пока нет альбомов"
            : value.length > 0
              ? `Выбрано: ${value.length}`
              : "Выбрать альбомы"}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {albums.map((album) => (
            <DropdownMenuCheckboxItem
              key={album.id}
              checked={value.some((selected) => selected.id === album.id)}
              onCheckedChange={(checked) => toggle(album, checked)}
              closeOnClick={false}
            >
              {album.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <RemovableChipList items={value} onRemove={remove} />
    </div>
  );
}
