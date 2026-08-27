"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Network, Users, MapPin, Settings, type LucideIcon } from "lucide-react";

/**
 * Icon components (functions) can't cross the Server->Client Component prop
 * boundary — React only allows plain serializable data through (see
 * https://nextjs.org/docs error "Functions cannot be passed directly to
 * Client Components"). families/[slug]/layout.tsx is a Server Component, so
 * SetFamilyNav takes this key instead of a LucideIcon, and MobileHeaderPanel
 * (itself a Client Component) resolves the actual component from this map.
 */
const NAV_ICONS = {
  tree: Network,
  people: Users,
  places: MapPin,
  settings: Settings,
} as const satisfies Record<string, LucideIcon>;

export type FamilyNavIconKey = keyof typeof NAV_ICONS;

export function resolveFamilyNavIcon(key: FamilyNavIconKey): LucideIcon {
  return NAV_ICONS[key];
}

export interface FamilyNavItem {
  href: string;
  icon: FamilyNavIconKey;
  label: string;
}

interface FamilyNavContextValue {
  items: FamilyNavItem[];
  setItems: (items: FamilyNavItem[]) => void;
}

const FamilyNavContext = createContext<FamilyNavContextValue | null>(null);

/**
 * Holds the current family section's nav items (tree / people / places /
 * settings — the same destinations as the dashboard's FamilyNavCard grid) so
 * they can be rendered in AppHeader's mobile panel — an ancestor of every
 * page, sitting above FamilyProvider, so it can't read useFamily() itself.
 * Same publish-up pattern as breadcrumbs-context.tsx: SetFamilyNav below is
 * the write side (called once from families/[slug]/layout.tsx), MobileHeaderPanel
 * reads via useFamilyNav.
 */
export function FamilyNavProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FamilyNavItem[]>([]);
  return (
    <FamilyNavContext.Provider value={{ items, setItems }}>{children}</FamilyNavContext.Provider>
  );
}

export function useFamilyNav(): FamilyNavItem[] {
  const context = useContext(FamilyNavContext);
  if (!context) {
    throw new Error("useFamilyNav() must be used within a FamilyNavProvider");
  }
  return context.items;
}

/**
 * Renders nothing — published once from families/[slug]/layout.tsx so every
 * page under a family section carries the same mobile nav items, mirroring
 * SetBreadcrumbs's per-page publish. Set in an effect for the same reason as
 * SetBreadcrumbs: writes to a sibling-tree provider's state, which React
 * disallows synchronously during render of a different component. Clears
 * itself on unmount so leaving the family section doesn't leave stale items
 * showing (e.g. back on /families).
 */
export function SetFamilyNav({ items }: { items: FamilyNavItem[] }) {
  const context = useContext(FamilyNavContext);
  if (!context) {
    throw new Error("SetFamilyNav must be used within a FamilyNavProvider");
  }
  const { setItems } = context;

  const key = items.map((item) => `${item.href}:${item.label}`).join("|");
  useEffect(() => {
    setItems(items);
    return () => setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items compared via `key`, not identity
  }, [key, setItems]);

  return null;
}
