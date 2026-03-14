"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import PayrollStatCard from "@/components/payroll/PayrollStatCard";
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

  const activeCount = useMemo(
    () => filtered.filter((row) => !row.status || row.status.toLowerCase() === "active").length,
    [filtered]
  );

  const averageCompensation = totals.headcount > 0 ? totals.monthly / totals.headcount : 0;

  const handleExport = () => {
    if (filtered.length === 0) {
      setError("No salary rows to export");
      return;
    }

    const headers = ["Employee Code", "Employee Name", "Department", "Position", "Status", "Monthly Salary"];
    const safe = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rowsCsv = filtered.map((row) => [
      row.employee_code || "",
      row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      row.department || "",
      row.position || "",
      row.status || "Active",
      row.salary || 0,
    ].map(safe).join(","));

    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salary-ledger-${period.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <PayrollStatCard
            label="Active Headcount"
            value={String(totals.headcount)}
            helper={`${activeCount} active employees in current view`}
            icon={<Users className="h-5 w-5" />}
            tone="blue"
          />
          <PayrollStatCard
            label="Base Payroll (Monthly)"
            value={currency(totals.monthly)}
            helper="Current monthly salary liability"
            icon={<DollarSign className="h-5 w-5" />}
            tone="green"
          />
          <PayrollStatCard
            label="Annual Run-Rate"
            value={currency(totals.yearly)}
            helper="Projected annualized compensation"
            icon={<TrendingUp className="h-5 w-5" />}
            tone="indigo"
          />
          <PayrollStatCard
            label="Avg. Compensation"
            value={currency(averageCompensation)}
            helper="Per employee / month"
            icon={<DollarSign className="h-5 w-5" />}
            tone="slate"
            emphasis="inverted"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compensation Summary</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{activeCount} active</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">Period: {period}</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">Cycle: {cycleStatus}</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">Use department filtering to isolate payroll impact before generating the next payroll run.</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Ledger Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{currency(totals.monthly)}</p>
            <p className="mt-2 text-sm text-slate-600">Filtered monthly salary total for the current ledger view.</p>
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
