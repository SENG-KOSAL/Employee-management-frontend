import { useMemo } from "react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";

export const ACTIVE_COMPANY_ID_KEY = "active_company_id";
export const ACTIVE_COMPANY_NAME_KEY = "active_company_name";

export function useImpersonation() {
  const { activeCompany, isSupportMode, enterCompany, exitCompany } = useActiveCompany();

  // Deprecated compatibility wrapper:
  // old code expects (startImpersonation(companyId, name)) and localStorage-backed flags.
  // New implementation uses React Context + Next.js API routes.
  return useMemo(
    () => ({
      isImpersonating: isSupportMode,
      companyName: activeCompany?.name ?? null,
      startImpersonation: async (companyId: string | number) => {
        await enterCompany(companyId);
      },
      stopImpersonation: async () => {
        await exitCompany();
      },
    }),
    [activeCompany?.name, enterCompany, exitCompany, isSupportMode]
  );
}
