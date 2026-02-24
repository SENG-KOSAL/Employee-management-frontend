"use client";

import React from "react";
import { ActiveCompanyProvider } from "@/context/ActiveCompanyContext";
import SuperAdminBanner from "@/components/admin/SuperAdminBanner";

/**
 * AppProviders
 * Central place to mount client-side providers.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActiveCompanyProvider>
      <SuperAdminBanner />
      {children}
    </ActiveCompanyProvider>
  );
}
