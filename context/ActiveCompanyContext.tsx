"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { clearMeCache } from "@/lib/meCache";

/**
 * ActiveCompanyContext
 *
 * Source of truth for Super Admin support-mode (active company context).
 *
 * Notes:
 * - We store the active company in React Context for UI.
 * - We ALSO persist it to localStorage so existing company-side API calls (axios interceptor)
 *   can automatically attach the tenant header (X-Active-Company).
 * - We also persist it in cookies via Next.js API routes, so a reload can restore state.
 */

export type ActiveCompany = {
  id: string;
  name: string;
} | null;

type ActiveCompanyState = {
  activeCompany: ActiveCompany;
  isSupportMode: boolean;
  isReadOnly: boolean;
  loading: boolean;
  enterCompany: (companyId: string | number) => Promise<void>;
  exitCompany: () => Promise<void>;
  refreshActive: () => Promise<void>;
};

const ActiveCompanyContext = createContext<ActiveCompanyState | null>(null);

const LS_ID = "active_company_id";
const LS_NAME = "active_company_name";

const readLocal = (): ActiveCompany => {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(LS_ID);
  const name = window.localStorage.getItem(LS_NAME);
  if (!id) return null;
  return { id, name: name || "" };
};

const writeLocal = (company: ActiveCompany) => {
  if (typeof window === "undefined") return;
  if (!company) {
    window.localStorage.removeItem(LS_ID);
    window.localStorage.removeItem(LS_NAME);
    return;
  }
  window.localStorage.setItem(LS_ID, company.id);
  window.localStorage.setItem(LS_NAME, company.name);
};

export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompany, setActiveCompany] = useState<ActiveCompany>(null);
  const [loading, setLoading] = useState(true);

  const refreshActive = useCallback(async () => {
    setLoading(true);
    // Rely on client-side persisted state (backend /me is returning 500 for sessions).
    const local = readLocal();
    setActiveCompany(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  const enterCompany = useCallback(async (companyId: string | number) => {
    const payload = { company_id: Number.isFinite(Number(companyId)) ? Number(companyId) : companyId };
    const res = await api.post(`/api/v1/platform/context/enter`, payload);
    const data = res?.data as unknown;

    let next: ActiveCompany = { id: String(companyId), name: "" };
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      const company = rec.active_company || rec.company || rec.activeCompany;
      if (company && typeof company === "object") {
        const c = company as Record<string, unknown>;
        const id = typeof c.id === "string" ? c.id : typeof c.id === "number" ? String(c.id) : String(companyId);
        const name = typeof c.name === "string" ? c.name : "";
        next = { id, name };
      }
    }

    setActiveCompany(next);
    writeLocal(next);
    clearMeCache();

    // Full reload prevents cross-company cache leaks.
    window.location.href = "/dashboard";
  }, []);

  const exitCompany = useCallback(async () => {
    try {
      await api.post("/api/v1/platform/context/exit");
    } catch {
      // best-effort
    }

    setActiveCompany(null);
    writeLocal(null);
    clearMeCache();

    // Full reload prevents stale tenant data.
    window.location.href = "/super-admin/dashboard";
  }, []);

  const value = useMemo<ActiveCompanyState>(() => {
    const isSupportMode = !!activeCompany?.id;
    return {
      activeCompany,
      isSupportMode,
      isReadOnly: false, // super admin support mode has full access
      loading,
      enterCompany,
      exitCompany,
      refreshActive,
    };
  }, [activeCompany, enterCompany, exitCompany, loading, refreshActive]);

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error("useActiveCompany must be used within ActiveCompanyProvider");
  return ctx;
}
