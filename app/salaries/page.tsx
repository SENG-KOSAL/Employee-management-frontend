"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, Search, Eye, Calendar, DollarSign, Users, TrendingUp, ChevronDown, Download, CheckCircle2 } from "lucide-react";

interface SalaryRow {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string;
  position?: string;
  employee_code?: string;
  salary?: number;
  status?: string;
}

const currency = (value?: number | string) => {
  if (value === undefined || value === null) return "$0";
  const num = typeof value === "string" ? parseFloat(value || "0") : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0);
};

export default function SalariesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [period, setPeriod] = useState("March 2026");
  const [cycleStatus] = useState("Draft");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/employees?per_page=500");
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load salaries");
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.department) s.add(r.department); });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const deptTerm = dept.trim().toLowerCase();
    return rows.filter((r) => {
      const name = `${r.full_name || ""} ${r.first_name || ""} ${r.last_name || ""}`.toLowerCase();
      const code = (r.employee_code || "").toLowerCase();
      const deptName = (r.department || "").toLowerCase();
      const matchesSearch = term ? name.includes(term) || code.includes(term) : true;
      const matchesDept = deptTerm ? deptName === deptTerm : true;
      return matchesSearch && matchesDept;
    });
  }, [rows, search, dept]);

  const totals = useMemo(() => {
    const headcount = filtered.length;
    const monthly = filtered.reduce((acc, r) => acc + Number(r.salary || 0), 0);
    const yearly = monthly * 12;
    return { headcount, monthly, yearly };
  }, [filtered]);

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Salary Administration</h1>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cycleStatus === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                Cycle: {cycleStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500">Manage base compensation and review financial run-rates.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option>January 2026</option>
                <option>February 2026</option>
                <option>March 2026</option>
              </select>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>

            <button
              onClick={fetchRows}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm text-sm font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Sync
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Active Headcount</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{totals.headcount}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500"/> Stable vs last period</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full opacity-50 pointer-events-none"></div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Base Payroll (Monthly)</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{currency(totals.monthly)}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Draft liabilities</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full opacity-50 pointer-events-none"></div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Annual Run-Rate</p>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{currency(totals.yearly)}</h3>
              <p className="text-xs text-slate-500 mt-1">Projected annualized</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full opacity-50 pointer-events-none"></div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-400">Avg. Compensation</p>
              <div className="p-2 bg-slate-800 rounded-lg text-slate-300"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{totals.headcount > 0 ? currency(totals.monthly / totals.headcount) : "$0"}</h3>
              <p className="text-xs text-slate-400 mt-1">Per employee / mo</p>
            </div>
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </div>

        {/* Filter & Data Ledger Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee or code..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full md:w-48 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-500 font-medium">
              Showing {filtered.length} records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left align-middle">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Department & Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Fixed Salary (Mo)</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        <span>Syncing ledger data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                        <p>No salary records found for the applied filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(r.first_name?.[0] || r.full_name?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {r.full_name || `${r.first_name || ""} ${r.last_name || ""}`}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{r.employee_code || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-900 font-medium">{r.department || "-"}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{r.position || "-"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          !r.status || r.status.toLowerCase() === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : r.status.toLowerCase() === 'on leave'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.status || "Active"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-semibold text-slate-900 tabular-nums text-base">
                          {currency(r.salary)}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">USD / mo</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Link
                          href={`/employees/${r.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Employee Ledger"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Table Footer Summary */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm text-slate-600">
            <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400"/> Financial Period: {period}</span>
            <span>Ledger total: <strong className="text-slate-900">{currency(totals.monthly)}</strong></span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </HRMSSidebar>
  );
}
