"use client";

import { createContext, useContext } from "react";
import type { FamilyRole } from "@/domain/family/roles";

export interface FamilyContextValue {
  familyId: string;
  familyName: string;
  familyDescription: string;
  familySlug: string;
  role: FamilyRole;
  /** The current user's own default tree-focus person (see family.service.ts::updateDefaultFocusPerson) — null if unset. Per-user, not family-wide. */
  defaultFocusPerson: { id: string; name: string } | null;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({
  value,
  children,
}: {
  value: FamilyContextValue;
  children: React.ReactNode;
}) {
  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}

/** Access the current family's id/name/the caller's role from any client component beneath FamilyProvider. */
export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily() must be used within a FamilyProvider");
  }
  return context;
}
