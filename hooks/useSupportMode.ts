"use client";

import { useActiveCompany } from "@/context/ActiveCompanyContext";

/**
 * useSupportMode
 *
 * Lightweight helper for existing company-side pages to conditionally disable UI.
 *
 * Example:
 *   const { isSupportMode, isReadOnly } = useSupportMode();
 *   <button disabled={isReadOnly}>Save</button>
 */
export function useSupportMode() {
  const { activeCompany, isSupportMode, isReadOnly } = useActiveCompany();
  return { activeCompany, isSupportMode, isReadOnly };
}
