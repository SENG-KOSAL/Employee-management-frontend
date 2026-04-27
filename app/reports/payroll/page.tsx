"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, FileSpreadsheet, FileText, Filter, Sparkles } from "lucide-react";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type GenericRow = Record<string, unknown>;
type TabKey = "payroll" | "payslips" | "summary" | "insights";
type RangeKey = "day" | "week" | "month";

type PayrollRunRow = {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "approved" | "paid" | "other";
  payrollsCount: number;
  grossPay: number;
  netPay: number;
  deductions: number;
  createdAt: string;
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const frames = Math.max(1, Math.round(duration / 16));
    const from = value;
    const diff = target - from;

    const timer = setInterval(() => {
      frame += 1;
      const t = Math.min(1, frame / frames);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round((from + diff * eased) * 100) / 100);
      if (t >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

const toArray = (payload: unknown): GenericRow[] => {
  if (Array.isArray(payload)) return payload as GenericRow[];
  if (!payload || typeof payload !== "object") return [];
  const root = payload as GenericRow;
  if (Array.isArray(root.data)) return root.data as GenericRow[];
  if (root.data && typeof root.data === "object" && Array.isArray((root.data as GenericRow).data)) {
    return (root.data as GenericRow).data as GenericRow[];
  }
  return [];
};

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

const normalizeStatus = (value: unknown): PayrollRunRow["status"] => {
  const s = String(value || "").toLowerCase();
  if (s === "draft") return "draft";
  if (s === "approved") return "approved";
  if (s === "paid") return "paid";
  return "other";
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default function PayrollReportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("payroll");
  const [range, setRange] = useState<RangeKey>("month");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<PayrollRunRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [runSearch, setRunSearch] = useState("");

  const applyDatePreset = (daysBack: number) => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(start.getDate() - daysBack);
    const from = start.toISOString().slice(0, 10);
    setFromDate(from);
    setToDate(to);
  };

  const handleRangeChange = (nextRange: RangeKey) => {
    setRange(nextRange);
    if (nextRange === "day") {
      applyDatePreset(0);
      return;
    }
    if (nextRange === "week") {
      applyDatePreset(6);
      return;
    }
    applyDatePreset(29);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setRunSearch("");
    setRange("month");
    applyDatePreset(29);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    applyDatePreset(29);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const runsRes = await api.get("/api/v1/payroll-runs?per_page=300");

        const payload = toArray(runsRes.data);
        const mapped = payload
          .map((row): PayrollRunRow => {
            const grossPay = toNumber(row.total_gross_pay ?? row.gross_pay ?? row.total_amount);
            const netPay = toNumber(row.total_net_pay ?? row.net_pay);
            const deductions = toNumber(row.total_deductions ?? row.deductions);

            return {
              id: toNumber(row.id),
              periodStart: formatDate(row.period_start),
              periodEnd: formatDate(row.period_end),
              status: normalizeStatus(row.status),
              payrollsCount: toNumber(row.payrolls_count),
              grossPay,
              netPay,
              deductions,
              createdAt: formatDate(row.created_at),
            };
          })
          .filter((r) => r.id > 0)
          .sort((a, b) => (b.periodStart || b.createdAt).localeCompare(a.periodStart || a.createdAt));

        setRows(mapped);
      } catch {
        setError("Unable to load payroll report data.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const inDateRange = (date: string) => {
    if (!date) return true;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const search = runSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!inDateRange(row.periodStart || row.createdAt)) return false;
      if (!search) return true;
      return String(row.id).includes(search) || row.status.includes(search);
    });
  }, [rows, statusFilter, fromDate, toDate, runSearch]);

  const totalRuns = filtered.length;
  const draftRuns = filtered.filter((r) => r.status === "draft").length;
  const approvedRuns = filtered.filter((r) => r.status === "approved").length;
  const paidRuns = filtered.filter((r) => r.status === "paid").length;
  const totalNetPay = filtered.reduce((sum, row) => sum + row.netPay, 0);

  const animated = {
    total: useCountUp(totalRuns),
    draft: useCountUp(draftRuns),
    approved: useCountUp(approvedRuns),
    paid: useCountUp(paidRuns),
    netPay: useCountUp(totalNetPay),
  };

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { label: string; netPay: number; grossPay: number; runs: number }>();
    filtered.forEach((row) => {
      const key = (row.periodStart || row.createdAt).slice(0, 7);
      if (!key) return;
      const base = map.get(key) || { label: key, netPay: 0, grossPay: 0, runs: 0 };
      base.netPay += row.netPay;
      base.grossPay += row.grossPay;
      base.runs += 1;
      map.set(key, base);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([, value]) => ({ ...value, netPay: Number(value.netPay.toFixed(0)), grossPay: Number(value.grossPay.toFixed(0)) }));
  }, [filtered]);

  const statusTrend = useMemo(() => {
    const map = new Map<string, { label: string; draft: number; approved: number; paid: number }>();
    filtered.forEach((row) => {
      const key = (row.periodStart || row.createdAt).slice(0, 7);
      if (!key) return;
      const base = map.get(key) || { label: key, draft: 0, approved: 0, paid: 0 };
      if (row.status === "draft") base.draft += 1;
      if (row.status === "approved") base.approved += 1;
      if (row.status === "paid") base.paid += 1;
      map.set(key, base);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([, value]) => value);
  }, [filtered]);

  const topPayrollMonths = useMemo(() => {
    return [...monthlyTrend]
      .sort((a, b) => b.netPay - a.netPay)
      .slice(0, 5)
      .map((item) => ({ label: item.label, amount: item.netPay }));
  }, [monthlyTrend]);

  const exportExcel = () => {
    const lines: string[] = [];
    lines.push(["Run ID", "Period Start", "Period End", "Status", "Employees", "Gross Pay", "Net Pay", "Deductions"].map(csvCell).join(","));
    filtered.forEach((row) => {
      lines.push([row.id, row.periodStart, row.periodEnd, row.status, row.payrollsCount, row.grossPay, row.netPay, row.deductions].map(csvCell).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank");
    if (!popup) return;

    const rowsHtml = filtered
      .slice(0, 250)
      .map(
        (row) =>
          `<tr><td>${row.id}</td><td>${row.periodStart}</td><td>${row.periodEnd}</td><td>${row.status}</td><td>${row.payrollsCount}</td><td>${row.grossPay}</td><td>${row.netPay}</td><td>${row.deductions}</td></tr>`
      )
      .join("");

    popup.document.write(`
      <html>
        <head>
          <title>Payroll Report</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #3B82F6; color: #ffffff; }
          </style>
        </head>
        <body>
          <h1>Payroll Report Module</h1>
          <table>
            <thead>
              <tr>
                <th>Run ID</th><th>Period Start</th><th>Period End</th><th>Status</th><th>Employees</th><th>Gross Pay</th><th>Net Pay</th><th>Deductions</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "company_admin", "super_admin", "developer", "hr"]}>
        <div className="mx-auto max-w-7xl space-y-6 pb-10">
          <div className="text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-blue-700">
              Dashboard
            </Link>
            <span className="mx-2">→</span>
            <span className="font-semibold text-slate-700">📊 Payroll Report Module</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payroll → Report Module</h1>
              <p className="text-sm text-slate-600">Admin-friendly daily/monthly payroll insights with fast filters and exports.</p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { id: "payroll", label: "Payroll Report" },
                { id: "payslips", label: "Payslip Report" },
                { id: "summary", label: "Summary Report" },
                { id: "insights", label: "Insights" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id ? "bg-blue-500 text-white shadow" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition-all duration-500 ${
              ready ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Filter className="h-4 w-4" /> Filters
              </div>
              <button
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Reset filters
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Run status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Search run ID</span>
                <input
                  value={runSearch}
                  onChange={(e) => setRunSearch(e.target.value)}
                  placeholder="e.g. 1201"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">From</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">To</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Quick range</span>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleRangeChange(r.id as RangeKey)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${range === r.id ? "bg-blue-500 text-white" : "text-slate-600"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setRange("day"); applyDatePreset(0); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Today</button>
                  <button onClick={() => { setRange("week"); applyDatePreset(6); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Last 7 days</button>
                  <button onClick={() => { setRange("month"); applyDatePreset(29); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Last 30 days</button>
                </div>
              </div>
            </div>
          </div>

          {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading payroll report...</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {activeTab === "summary" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Summary Report ({range === "day" ? "Daily" : range === "week" ? "Weekly" : "Monthly"})</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  <CalendarDays className="h-3.5 w-3.5" /> Finance quick scan
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { title: "Total Runs", value: animated.total },
                  { title: "Draft", value: animated.draft },
                  { title: "Approved", value: animated.approved },
                  { title: "Paid", value: animated.paid },
                  { title: "Total Net Pay", value: formatMoney(animated.netPay) },
                ].map((card, index) => (
                  <div
                    key={card.title}
                    className={`rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-400 p-4 text-white shadow-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${
                      ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    }`}
                    style={{ transitionDelay: `${index * 90}ms` }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-100">{card.title}</div>
                    <div className="mt-2 text-2xl font-bold">{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "payroll" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Payroll Report</h2>
                <div className="flex items-center gap-2">
                  <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"><FileText className="h-4 w-4" /> PDF</button>
                  <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-500 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Run ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Period</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Employees</th>
                        <th className="px-4 py-3 text-left font-semibold">Gross Pay</th>
                        <th className="px-4 py-3 text-left font-semibold">Net Pay</th>
                        <th className="px-4 py-3 text-left font-semibold">Deductions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No payroll runs found.</td></tr>
                      ) : (
                        filtered.slice(0, 250).map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                            style={{ transitionDelay: `${Math.min(idx * 14, 260)}ms` }}
                          >
                            <td className="px-4 py-3 font-medium">#{row.id}</td>
                            <td className="px-4 py-3">{row.periodStart || "-"} → {row.periodEnd || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white ${row.status === "paid" ? "bg-emerald-500" : row.status === "approved" ? "bg-blue-500" : row.status === "draft" ? "bg-red-400" : "bg-slate-500"}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{row.payrollsCount}</td>
                            <td className="px-4 py-3">{formatMoney(row.grossPay)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(row.netPay)}</td>
                            <td className="px-4 py-3">{formatMoney(row.deductions)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "payslips" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Payslip Report</h2>
                <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"><FileSpreadsheet className="h-4 w-4" /> Export</button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 -rotate-1 opacity-0"}`}>
                  <div className="text-xs font-semibold uppercase text-slate-500">Generated Payslips (Est.)</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{filtered.reduce((sum, r) => sum + r.payrollsCount, 0)}</div>
                </div>
                <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 rotate-1 opacity-0"}`}>
                  <div className="text-xs font-semibold uppercase text-slate-500">Average Net / Employee</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">
                    {formatMoney(
                      filtered.reduce((sum, r) => sum + r.netPay, 0) /
                        Math.max(1, filtered.reduce((sum, r) => sum + Math.max(1, r.payrollsCount), 0))
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-500 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Batch ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Period</th>
                        <th className="px-4 py-3 text-left font-semibold">Payslips</th>
                        <th className="px-4 py-3 text-left font-semibold">Net Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No payslip batches found.</td></tr>
                      ) : (
                        filtered.map((row, idx) => (
                          <tr key={`payslip-${row.id}`} className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${ready ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${Math.min(idx * 14, 260)}ms` }}>
                            <td className="px-4 py-3 font-medium">PAY-{row.id}</td>
                            <td className="px-4 py-3">{row.periodStart || "-"} → {row.periodEnd || "-"}</td>
                            <td className="px-4 py-3">{row.payrollsCount}</td>
                            <td className="px-4 py-3">{formatMoney(row.netPay)}</td>
                            <td className="px-4 py-3">{row.createdAt || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "insights" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Monthly Net vs Gross Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip formatter={(v: number | string | undefined) => formatMoney(Number(v || 0))} />
                        <Line type="monotone" dataKey="grossPay" stroke="#3B82F6" strokeWidth={3} animationDuration={900} />
                        <Line type="monotone" dataKey="netPay" stroke="#10B981" strokeWidth={2} animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Status Comparison</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusTrend}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#64748B" />
                        <YAxis stroke="#64748B" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="draft" fill="#EF4444" radius={[8, 8, 0, 0]} animationDuration={850} />
                        <Bar dataKey="approved" fill="#3B82F6" radius={[8, 8, 0, 0]} animationDuration={900} />
                        <Bar dataKey="paid" fill="#10B981" radius={[8, 8, 0, 0]} animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <Sparkles className="h-4 w-4" /> Top Payroll Months
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topPayrollMonths.length === 0 ? (
                      <span className="text-sm text-slate-500">No payroll month trends yet.</span>
                    ) : (
                      topPayrollMonths.map((item, idx) => (
                        <span key={item.label} className={`rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-all duration-500 ${ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`} style={{ transitionDelay: `${idx * 80}ms` }}>
                          {item.label} • {formatMoney(item.amount)}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Export Center</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"><FileText className="h-4 w-4" /> Export PDF</button>
                    <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"><FileSpreadsheet className="h-4 w-4" /> Export Excel</button>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Export table and trend data for finance review or monthly audit.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
