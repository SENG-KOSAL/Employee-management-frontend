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
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Edit2,
  Save,
  X
} from "lucide-react";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
  status: string;
  headcount?: number;
  created_at?: string;
  updated_at?: string;
};

const PRICE_PER_EMPLOYEE = 1.20;

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
  return (
    role === "super_admin" ||
    role === "super-admin" ||
    role === "superadmin" ||
    role === "developer"
  );
};

// Simple animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

const StatCard = ({ title, value, prefix = "", suffix = "", icon: Icon, colorClass }: any) => {
  const numericValue = typeof value === 'number' ? value : 0;
  const animatedValue = useAnimatedCounter(numericValue);
  
  return (
    <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute -top-6 -right-6 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-300 transform group-hover:scale-110 rounded-full ${colorClass.split(' ')[0]}`}>
        <Icon className="w-24 h-24 text-current" />
      </div>
      <div className="flex items-center justify-between relative z-10">
        <div className={`p-3 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClass.split(' ')[1]}`} />
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-1 flex items-baseline gap-1">
          {prefix}{typeof value === 'number' ? animatedValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}{suffix}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colorClass.split(' ')[0]}`} />
    </div>
  );
};

export default function SuperAdminConsole() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCompanyId, setBusyCompanyId] = useState<number | null>(null);

  const [headcounts, setHeadcounts] = useState<Record<number, number>>({});
  const [editingHeadcountId, setEditingHeadcountId] = useState<number | null>(null);
  const [editHeadcountValue, setEditHeadcountValue] = useState<string>("");

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

      const res = await api.get("/api/v1/platform/companies", {
        params: { per_page: 100 },
      });

      const raw: unknown = res?.data;
      const list: Company[] = (() => {
        let result: Company[] = [];
        if (Array.isArray(raw)) result = raw as Company[];
        else if (raw && typeof raw === "object") {
          const rec = raw as Record<string, unknown>;
          const inner = rec.data;
          if (Array.isArray(inner)) result = inner as Company[];
        }
        return result;
      })();
      setCompanies(list);
      
      // Initialize local headcounts if not set, avoiding random numbers.
      setHeadcounts((prev) => {
        const next = { ...prev };
        list.forEach((c) => {
          if (next[c.id] === undefined) {
            next[c.id] = c.headcount ?? 0; // Default to 0, completely manual stable value
          }
        });
        return next;
      });
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
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        String(c.slug ?? "").toLowerCase().includes(s)
    );
  }, [companies, searchTerm]);

  // Calculations for stats
  const totalHeadcount = useMemo(() => companies.reduce((sum, c) => sum + (headcounts[c.id] || 0), 0), [companies, headcounts]);
  const totalRevenue = totalHeadcount * PRICE_PER_EMPLOYEE;
  // This could represent an assumed 90% active conversion if we like, or simply a stat:
  const activeUsers = useMemo(() => companies.reduce((sum, c) => sum + (isActive(c.status) ? (headcounts[c.id] || 0) : 0), 0), [companies, headcounts]);

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

  const startEditHeadcount = (company: Company) => {
    setEditingHeadcountId(company.id);
    setEditHeadcountValue(String(headcounts[company.id] || 0));
  };

  const saveHeadcount = async (companyId: number) => {
    try {
      const val = parseInt(editHeadcountValue, 10);
      if (isNaN(val) || val < 0) throw new Error("Invalid headcount");
      
      setHeadcounts(prev => ({ ...prev, [companyId]: val }));
      setEditingHeadcountId(null);
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Failed to update headcount"));
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-medium mb-2 transition-all hover:bg-indigo-100">
              <Shield className="w-3.5 h-3.5" />
              Developer Console
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Super Admin
            </h1>
            <p className="text-slate-500 text-sm">
              Manage tenants, company billing, and system settings.
            </p>
          </div>
          <button
            onClick={() => router.push("/super-admin/companies/create")}
            className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1),_0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_2px_4px_-1px_rgba(0,0,0,0.06)]"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            New Company
          </button>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title="Total Companies" 
            value={companies.length} 
            icon={Building2} 
            colorClass="bg-blue-600 text-blue-600"
          />
          <StatCard 
            title="Active Users" 
            value={activeUsers} 
            icon={Users} 
            colorClass="bg-indigo-600 text-indigo-600"
          />
          <StatCard 
            title="Total Revenue" 
            value={totalRevenue} 
            prefix="$" 
            icon={DollarSign} 
            colorClass="bg-emerald-600 text-emerald-600"
          />
          <StatCard 
            title="System Health" 
            value={99.9} 
            suffix="%" 
            icon={Activity} 
            colorClass="bg-teal-600 text-teal-600"
          />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-800 text-lg">Companies</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                {filteredCompanies.length}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72 group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => loadCompanies()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-5 p-4 text-sm text-red-600 bg-red-50/50 border border-red-100 rounded-xl flex items-center gap-3">
               <Ban className="w-4 h-4 text-red-500 shrink-0" />
               {error}
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto relative min-h-[400px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#FAFAFA] border-b border-slate-100 text-slate-500 font-medium sticky top-0 z-10 transition-colors">
                <tr>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Headcount</th>
                  <th className="px-6 py-4">Price/Emp</th>
                  <th className="px-6 py-4">Monthly Cost</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  // Skeleton Loaders
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse bg-white">
                      <td className="px-6 py-5"><div className="h-10 border border-slate-100 bg-slate-50 rounded-xl w-48"></div></td>
                      <td className="px-6 py-5"><div className="h-6 border border-slate-100 bg-slate-50 rounded-full w-20"></div></td>
                      <td className="px-6 py-5"><div className="h-5 border border-slate-100 bg-slate-50 rounded w-24"></div></td>
                      <td className="px-6 py-5"><div className="h-5 border border-slate-100 bg-slate-50 rounded w-16"></div></td>
                      <td className="px-6 py-5"><div className="h-5 border border-slate-100 bg-slate-50 rounded w-16"></div></td>
                      <td className="px-6 py-5"><div className="h-5 border border-slate-100 bg-slate-50 rounded w-20"></div></td>
                      <td className="px-6 py-5 flex justify-end gap-2"><div className="h-8 border border-slate-100 bg-slate-50 rounded-lg w-24"></div></td>
                    </tr>
                  ))
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-500 bg-white">
                      <div className="inline-flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="font-medium text-slate-700 text-base">No companies found</p>
                        <p className="text-sm mt-1 mb-4">Adjust your search criteria or add a new company.</p>
                        <button
                          onClick={() => router.push("/super-admin/companies/create")}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          New Company
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => {
                    const currentHeadcount = headcounts[company.id] || 0;
                    const cost = currentHeadcount * PRICE_PER_EMPLOYEE;
                    const isEditing = editingHeadcountId === company.id;
                    const active = isActive(company.status);

                    return (
                      <tr 
                        key={company.id} 
                        className="group hover:bg-slate-50/80 transition-colors duration-200"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{company.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {company.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                                : "bg-red-50 text-red-700 border-red-200/50"
                            }`}
                          >
                           <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {company.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{company.slug || "-"}</span>
                        </td>
                        
                        {/* Headcount Column */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                             <div className="flex items-center gap-1">
                               <input 
                                 type="number"
                                 autoFocus
                                 className="w-20 px-2.5 py-1.5 text-sm bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all"
                                 value={editHeadcountValue}
                                 onChange={e => setEditHeadcountValue(e.target.value)}
                                 onKeyDown={(e) => {
                                   if(e.key === 'Enter') saveHeadcount(company.id);
                                   if(e.key === 'Escape') setEditingHeadcountId(null);
                                 }}
                               />
                               <button onClick={() => saveHeadcount(company.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-colors" title="Save">
                                 <Save className="w-4 h-4"/>
                               </button>
                               <button onClick={() => setEditingHeadcountId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors" title="Cancel">
                                 <X className="w-4 h-4"/>
                               </button>
                             </div>
                          ) : (
                             <div className="flex items-center gap-2 group/edit w-24">
                               <span className="text-slate-700 font-medium px-2 py-1">{currentHeadcount}</span>
                               <button 
                                 onClick={() => startEditHeadcount(company)}
                                 className="opacity-0 group-hover/edit:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                 title="Edit Headcount"
                               >
                                 <Edit2 className="w-3.5 h-3.5" />
                               </button>
                             </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">${PRICE_PER_EMPLOYEE.toFixed(2)}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <span className="inline-flex bg-emerald-50/50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100/50 font-mono text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                            ${cost.toFixed(2)}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 isolate">
                            
                            <EnterCompanyButton
                              companyId={company.id}
                              companySlug={company.slug}
                              disabled={!active}
                              onError={(msg) => alert(getErrorMessage({ message: msg } as unknown, msg))}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-all text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed z-0"
                            />

                            {/* Dropdown-like simple actions (inline for rapid use) */}
                            {active ? (
                              <button
                                onClick={() => suspendCompany(company.id)}
                                disabled={busyCompanyId === company.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-red-200 hover:text-red-600 hover:bg-red-50 text-slate-600 font-medium transition-all text-xs shadow-sm disabled:opacity-50"
                                title="Suspend company"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => enableCompany(company.id)}
                                disabled={busyCompanyId === company.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 text-slate-600 font-medium transition-all text-xs shadow-sm disabled:opacity-50"
                                title="Enable company"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Enable
                              </button>
                            )}

                            <button
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-colors"
                              title="More options"
                              onClick={() => router.push(`/super-admin/companies/${company.id}`)}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}
