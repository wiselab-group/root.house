"use client";

import { createContext, useContext } from "react";
import type { FamilyRole } from "@/domain/family/roles";

export interface FamilyContextValue {
  familyId: string;
  familyName: string;
  role: FamilyRole;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({
  value,
  children,
}: {
  value: FamilyContextValue;
  children: React.ReactNode;
}) {
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

/** Access the current family's id/name/the caller's role from any client component beneath FamilyProvider. */
export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily() must be used within a FamilyProvider");
  }
  return context;
}
