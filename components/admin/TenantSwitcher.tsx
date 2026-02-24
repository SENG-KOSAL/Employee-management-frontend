"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import axios from "axios";

import { useActiveCompany } from "@/context/ActiveCompanyContext";
import { getToken } from "@/utils/auth";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
  status?: string | null;
};

const isActive = (status: unknown) => String(status ?? "").toLowerCase() === "active";

export default function TenantSwitcher() {
  const { activeCompany, enterCompany, exitCompany, isSupportMode } = useActiveCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedId = useMemo(() => activeCompany?.id ?? "", [activeCompany?.id]);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use same-origin Next.js proxy so this works on tenant subdomains too.
      const token = getToken();
      const res = await axios.get("/api/admin/companies", {
        params: { per_page: 200 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const raw: unknown = res?.data;
      const list: Company[] = (() => {
        if (Array.isArray(raw)) return raw as Company[];
        if (raw && typeof raw === "object") {
          const rec = raw as Record<string, unknown>;
          const inner = rec.data;
          if (Array.isArray(inner)) return inner as Company[];
        }
        return [];
      })();
      setCompanies(list);
    } catch (e) {
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const isTenantHost = () => {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    if (!host || host === "localhost" || host === "127.0.0.1") return false;

    const parts = host.split(".").filter(Boolean);
    if (parts.length < 2) return false;

    const sub = parts[0]?.toLowerCase();
    if (!sub || sub === "platform" || sub === "app" || sub === "www") return false;
    return true;
  };

  const buildTenantUrl = (slug: string, pathname: string) => {
    const { protocol, hostname, port } = window.location;

    const envSuffix = process.env.NEXT_PUBLIC_TENANT_HOST_SUFFIX;
    const inferredSuffix = (() => {
      if (hostname === "localhost" || hostname.endsWith(".localhost")) return "localhost";
      if (hostname === "local" || hostname.endsWith(".local")) return "local";
      const parts = hostname.split(".");
      if (parts.length <= 1) return hostname;
      return parts.slice(1).join(".");
    })();

    const suffix = (envSuffix && String(envSuffix).trim()) || inferredSuffix;
    const host = `${slug}.${suffix}`;
    const portPart = port ? `:${port}` : "";
    return `${protocol}//${host}${portPart}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  };

  const handleChange = async (value: string) => {
    setError(null);

    if (!value) {
      if (isSupportMode) await exitCompany();
      return;
    }

    // If we're already on a tenant subdomain, switching tenants should jump to the new tenant host.
    // (Support Mode switching is a platform-domain concept.)
    if (typeof window !== "undefined" && isTenantHost()) {
      const selected = companies.find((c) => String(c.id) === String(value));
      const slug = selected?.slug ? String(selected.slug).trim() : "";
      if (!slug) {
        setError("Selected company has no slug");
        return;
      }

      // Redirect to tenant login page; token is not shared across subdomains (localStorage).
      window.location.assign(buildTenantUrl(slug, "/auth/login"));
      return;
    }

    try {
      await enterCompany(value);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Failed to switch tenant";
      setError(msg);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-600">
        <Building2 className="size-4 text-blue-600" />
        <span className="uppercase tracking-wide">Tenant</span>
        {isSupportMode ? (
          <span className="text-amber-700 font-bold truncate max-w-[160px]">{activeCompany?.name || activeCompany?.id}</span>
        ) : (
          <span className="text-gray-400">(none)</span>
        )}
      </div>

      <select
        value={selectedId}
        onChange={(e) => void handleChange(e.target.value)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 max-w-[260px]"
      >
        <option value="">-- Select company --</option>
        {companies
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => (
            <option key={c.id} value={String(c.id)} disabled={!isActive(c.status)}>
              {c.name}{!isActive(c.status) ? " (inactive)" : ""}
            </option>
          ))}
      </select>

      <button
        type="button"
        onClick={loadCompanies}
        disabled={loading}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title="Refresh companies"
      >
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      </button>

      {isSupportMode ? (
        <button
          type="button"
          onClick={() => void exitCompany()}
          className="h-9 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          Exit
        </button>
      ) : null}

      {error ? <span className="hidden md:inline text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
