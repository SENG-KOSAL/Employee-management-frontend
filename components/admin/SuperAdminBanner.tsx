"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";
import ExitSupportModeButton from "@/components/admin/ExitSupportModeButton";

export default function SuperAdminBanner() {
  const { activeCompany, isSupportMode } = useActiveCompany();

  // Only show banner when Super Admin is in Support Mode.
  if (!isSupportMode) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md relative z-[9999]">
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="w-5 h-5" />
        <span>
          Viewing Company: <strong>{activeCompany?.name || activeCompany?.id || "(unknown)"}</strong> (Support Mode). Full admin access enabled.
        </span>
      </div>
      <ExitSupportModeButton className="bg-white text-amber-600 hover:bg-amber-50 px-3 py-1 rounded text-sm font-bold flex items-center gap-1 transition-colors" />
    </div>
  );
}
