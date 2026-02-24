"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { fetchMe } from "@/lib/meCache";
import EnterCompanyButton from "@/components/admin/EnterCompanyButton";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  Ban,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== "object") return fallback;
  const rec = err as Record<string, unknown>;
  const response = rec.response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    const data = r.data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
    }
  }
  if (typeof rec.message === "string") return rec.message;
  return fallback;
};

const isPlatformSuperRole = (me: { role?: string | null; employee?: { role?: string | null } | null } | null) => {
  const role = String(me?.role ?? me?.employee?.role ?? "").toLowerCase();
  return role === "super_admin" || role === "super-admin" || role === "superadmin" || role === "developer";
};

export default function SuperAdminConsole() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCompanyId, setBusyCompanyId] = useState<number | null>(null);

  const isActive = (status: string) => String(status ?? "").toLowerCase() === "active";

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      if (!isPlatformSuperRole(me)) {
        router.push("/dashboard");
        return;
      }

      // Direct backend call: GET /api/v1/platform/companies
      const res = await api.get("/api/v1/platform/companies", {
        params: { per_page: 100 },
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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load companies"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(s) || String(c.slug ?? "").toLowerCase().includes(s));
  }, [companies, searchTerm]);

  const suspendCompany = async (companyId: number) => {
    setBusyCompanyId(companyId);
    try {
      await api.post(`/api/v1/platform/companies/${companyId}/suspend`);
      await loadCompanies();
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Failed to suspend company"));
    } finally {
      setBusyCompanyId(null);
    }
  };

  const enableCompany = async (companyId: number) => {
    setBusyCompanyId(companyId);
    try {
      await api.post(`/api/v1/platform/companies/${companyId}/enable`);
      await loadCompanies();
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Failed to enable company"));
    } finally {
      setBusyCompanyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Shield className="w-8 h-8 text-indigo-600" />
              Super Admin / Developer Consolekkkkkkkkkkk
            </h1>
            <p className="text-slate-500 mt-1">Manage tenants and system setting.</p>
          </div>
          <button
            onClick={() => router.push("/super-admin/companies/create")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Companyddddd
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-sm font-medium">Total Companies</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{companies.length}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-sm font-medium">Active Users</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">2,405</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-sm font-medium">System Health</div>
                <div className="text-3xl font-bold text-emerald-600 mt-2">99.8%</div>
            </div>
        </div>

        {/* Company List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">Companies</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadCompanies()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-white bg-slate-50 text-slate-700"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
          )}

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Company Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-slate-500" colSpan={4}>
                    Loading companies…
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      {company.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isActive(company.status)
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{company.slug ?? "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <EnterCompanyButton
                        companyId={company.id}
                        companySlug={company.slug}
                        disabled={!isActive(company.status)}
                        onError={(msg) => alert(getErrorMessage({ message: msg } as unknown, msg))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 font-medium transition-colors text-xs mr-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />

                      {isActive(company.status) ? (
                        <button
                          onClick={() => suspendCompany(company.id)}
                          disabled={busyCompanyId === company.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 rounded hover:bg-red-50 text-red-700 font-medium transition-colors text-xs mr-2 shadow-sm disabled:opacity-50"
                          title="Suspend company"
                        >
                          <Ban className="w-3 h-3" />
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => enableCompany(company.id)}
                          disabled={busyCompanyId === company.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-200 rounded hover:bg-emerald-50 text-emerald-700 font-medium transition-colors text-xs mr-2 shadow-sm disabled:opacity-50"
                          title="Enable company"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Enable
                        </button>
                      )}

                      <button
                        className="text-slate-400 hover:text-slate-600"
                        title="Manage"
                        onClick={() => router.push(`/super-admin/companies/${company.id}`)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {!loading && filteredCompanies.length === 0 && (
             <div className="p-8 text-center text-slate-500">
                No companies found.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
