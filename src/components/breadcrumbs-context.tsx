"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);

/**
 * Holds the current page's breadcrumb trail so it can be rendered in
 * AppHeader — an ancestor of every page — even though each page (a Server
 * Component) computes its own trail and Next.js layouts have no way for a
 * child page to write into a parent layout's already-rendered markup.
 * SetBreadcrumbs below is the write side; AppHeader reads via useBreadcrumbs.
 */
export function BreadcrumbsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  return (
    <BreadcrumbsContext.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error("useBreadcrumbs() must be used within a BreadcrumbsProvider");
  }
  return context.items;
}

/**
 * Renders nothing — a page drops this in to publish its breadcrumb trail up
 * to AppHeader. Set in an effect (not during render) because it writes to a
 * sibling-tree provider's state, which React disallows synchronously during
 * render of a different component; the one-render lag this causes is
 * invisible (header and page content never paint separately here).
 * Clears itself on unmount so navigating away doesn't leave a stale trail
 * showing while the next page's own effect hasn't run yet.
 */
export function SetBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error("SetBreadcrumbs must be used within a BreadcrumbsProvider");
  }
  const { setItems } = context;

  // items is a fresh array/object literal from the caller on every render —
  // comparing by JSON keeps the effect from re-firing (and re-rendering
  // AppHeader) every time the page itself re-renders for unrelated reasons.
  const key = JSON.stringify(items);
  useEffect(() => {
    setItems(items);
    return () => setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items compared via `key`, not identity
  }, [key, setItems]);

  return null;
}
