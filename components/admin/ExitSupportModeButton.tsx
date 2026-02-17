"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";

/**
 * ExitSupportModeButton
 * Reusable button to exit the active company context.
 */
export default function ExitSupportModeButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { exitCompany } = useActiveCompany();

  return (
    <button type="button" onClick={exitCompany} className={className}>
      {children ?? (
        <>
          <LogOut className="w-4 h-4" />
          Exit Support Mode
        </>
      )}
    </button>
  );
}
