"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";
import ExitSupportModeButton from "@/components/admin/ExitSupportModeButton";

export default function SuperAdminBanner() {
  const { activeCompany, isSupportMode } = useActiveCompany();

  // Only show banner when Super Admin is in Support Mode.
  if (!isSupportMode) return null;

  const companyLabel = activeCompany?.name || activeCompany?.id || "(unknown)";

  return (
    <div className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md relative z-[9999] border-b border-blue-200/40">
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="w-5 h-5" />
        <span>
          Viewing Company: <strong>{companyLabel}</strong> (Support Mode). Full admin access enabled.
        </span>
      </div>
      <ExitSupportModeButton className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 rounded text-sm font-bold flex items-center gap-1 transition-colors" />
    </div>
  );
}
