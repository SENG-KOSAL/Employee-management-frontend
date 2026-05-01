"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type EmployeeRow = {
  id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string | { name?: string };
  position?: string;
  salary?: number | string;
  status?: string;
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as any).data)) return (data as any).data as T[];
  return [];
};

const toNumber = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const nameOf = (row: Partial<EmployeeRow>) => row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Employee";
const deptOf = (row: Partial<EmployeeRow>) => typeof row.department === "string" ? row.department : row.department?.name || "Unassigned";

export default function EmployeeSummaryReportPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");

  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
  const [detailTrend, setDetailTrend] = useState<Array<{ label: string; hours: number }>>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState({ used: 0, remaining: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/v1/employees?per_page=500");
        setRows(extractArray<EmployeeRow>(res.data));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const h = `${nameOf(row)} ${row.employee_code || ""} ${deptOf(row)} ${row.position || ""}`.toLowerCase();
      return !term || h.includes(term);
    });
  }, [rows, search]);

  const openModal = async (employeeId: number) => {
    setActiveEmployeeId(employeeId);

    const [attendanceRes, leaveRes, benefitsRes, deductionsRes, auditRes] = await Promise.allSettled([
      api.get(`/api/v1/attendances/summary?employee_id=${employeeId}&type=monthly`),
      api.get(`/api/v1/leave-requests?employee_id=${employeeId}&per_page=200`),
      api.get(`/api/v1/employee-benefits?employee_id=${employeeId}`),
      api.get(`/api/v1/employee-deductions?employee_id=${employeeId}`),
      api.get(`/api/v1/employees/${employeeId}/audit-trail?per_page=20`),
    ]);

    if (attendanceRes.status === "fulfilled") {
      const payload = attendanceRes.value.data?.data ?? attendanceRes.value.data;
      const trend = Array.isArray(payload?.trend) ? payload.trend : [];
      setDetailTrend(trend.map((r: any, idx: number) => ({ label: String(r.label || r.date || `P${idx + 1}`), hours: toNumber(r.total_hours || r.hours || r.total) })));
    } else {
      setDetailTrend([]);
    }

    if (leaveRes.status === "fulfilled") {
      const leaveRows = extractArray<any>(leaveRes.value.data);
      const used = leaveRows.filter((r) => String(r.status || "").toLowerCase() === "approved").reduce((acc, r) => acc + toNumber(r.days || 1), 0);
      setLeaveBalance({ used, remaining: Math.max(0, 24 - used) });
    } else {
      setLeaveBalance({ used: 0, remaining: 0 });
    }

    setBenefits(benefitsRes.status === "fulfilled" ? extractArray<any>(benefitsRes.value.data) : []);
    setDeductions(deductionsRes.status === "fulfilled" ? extractArray<any>(deductionsRes.value.data) : []);
    setAuditTrail(auditRes.status === "fulfilled" ? extractArray<any>(auditRes.value.data) : []);
  };

  const activeEmployee = useMemo(() => rows.find((row) => row.id === activeEmployeeId) || null, [rows, activeEmployeeId]);

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="text-xs text-slate-500"><Link href="/dashboard" className="hover:text-indigo-600">Home</Link><span className="mx-2">→</span><Link href="/reports" className="hover:text-indigo-600">Reports</Link><span className="mx-2">→</span><span className="text-slate-700 font-semibold">Employee Summary</span></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Summary Report</h1>
            <p className="text-sm text-slate-500">Salary, leave usage, overtime, and employee insight drill-down.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, code, department" className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm" /></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Salary</th><th className="px-4 py-3">Leave Used</th><th className="px-4 py-3">Overtime Hours</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading employees...</td></tr>) : filtered.length === 0 ? (<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No employees found.</td></tr>) : filtered.map((row, idx) => (
                    <tr key={row.id} className="summary-row cursor-pointer hover:bg-indigo-50/40 transition-colors" style={{ animationDelay: `${idx * 30}ms` }} onClick={() => void openModal(row.id)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{nameOf(row)}</td>
                      <td className="px-4 py-3">{deptOf(row)}</td>
                      <td className="px-4 py-3">{row.position || "-"}</td>
                      <td className="px-4 py-3">${toNumber(row.salary).toLocaleString()}</td>
                      <td className="px-4 py-3">-</td>
                      <td className="px-4 py-3">-</td>
                      <td className="px-4 py-3">{row.status || "active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${activeEmployeeId ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setActiveEmployeeId(null)} />
        <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${activeEmployeeId ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs uppercase font-semibold text-indigo-600">Employee Insight</p><h3 className="text-lg font-bold text-slate-900">{activeEmployee ? nameOf(activeEmployee) : "Employee"}</h3></div><button onClick={() => setActiveEmployeeId(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-72px)]">
            <div className="rounded-xl border border-slate-200 p-4"><h4 className="text-sm font-semibold text-slate-800 mb-2">Attendance Chart</h4><div className="h-52">{detailTrend.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-slate-500">No attendance data.</div> : <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={detailTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={2} dot={false} isAnimationActive animationDuration={500} /></LineChart></ResponsiveContainer>}</div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs uppercase font-semibold text-emerald-700">Leave Used</p><p className="text-xl font-bold text-emerald-900 mt-1">{leaveBalance.used}</p></div><div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs uppercase font-semibold text-blue-700">Leave Remaining</p><p className="text-xl font-bold text-blue-900 mt-1">{leaveBalance.remaining}</p></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs uppercase font-semibold text-emerald-700">Benefits ({benefits.length})</p><ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">{benefits.map((row, idx) => <li key={idx} className="text-xs">{String(row.name || row.type || "Benefit")} - {toNumber(row.amount).toFixed(2)}</li>)}</ul></div><div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs uppercase font-semibold text-rose-700">Deductions ({deductions.length})</p><ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">{deductions.map((row, idx) => <li key={idx} className="text-xs">{String(row.name || row.type || "Deduction")} - {toNumber(row.amount).toFixed(2)}</li>)}</ul></div></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800 mb-2">Audit Trail</p><div className="space-y-2 max-h-40 overflow-y-auto">{auditTrail.length === 0 ? <p className="text-xs text-slate-500">No audit history.</p> : auditTrail.map((row, idx) => <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"><p className="font-medium text-slate-800">{String(row.action || row.event || "Updated")}</p><p className="text-slate-500 mt-1">{String(row.created_at || row.timestamp || "-")}</p></div>)}</div></div>
          </div>
        </div>

        <style jsx>{`
          .summary-row { opacity: 0; transform: translateY(6px); animation: rowIn 300ms ease-out forwards; }
          @keyframes rowIn { to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </RoleGate>
    </HRMSSidebar>
  );
}
