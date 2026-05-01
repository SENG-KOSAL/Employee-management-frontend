"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Filter, Search, X } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type LeaveRow = {
  id: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  days?: number;
  leave_type?: { name?: string };
  employee?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    department?: string | { name?: string };
  };
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

const getName = (row: LeaveRow) => row.employee?.full_name || `${row.employee?.first_name || ""} ${row.employee?.last_name || ""}`.trim() || "Employee";
const getDept = (row: LeaveRow) => typeof row.employee?.department === "string" ? row.employee.department : row.employee?.department?.name || "Unassigned";

export default function LeaveReportPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/leave-requests?per_page=800");
      const list = extractArray<LeaveRow>(res.data);
      setRows(list);
      setDepartments(Array.from(new Set(list.map((row) => getDept(row)))).sort((a, b) => a.localeCompare(b)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const name = getName(row).toLowerCase();
      const dept = getDept(row).toLowerCase();
      const typeName = String(row.leave_type?.name || "").toLowerCase();
      const rowStatus = String(row.status || "").toLowerCase();
      const date = String(row.start_date || "");

      const matchesSearch = !term || name.includes(term);
      const matchesDept = !department || dept === department.toLowerCase();
      const matchesType = !leaveType || typeName === leaveType.toLowerCase();
      const matchesStatus = !status || rowStatus === status.toLowerCase();
      const matchesFrom = !from || date >= from;
      const matchesTo = !to || date <= to;

      return matchesSearch && matchesDept && matchesType && matchesStatus && matchesFrom && matchesTo;
    });
  }, [rows, search, department, leaveType, status, from, to]);

  const summaryRows = useMemo(() => {
    const map = new Map<number, { employee: LeaveRow["employee"]; leaveType: string; used: number; total: number }>();

    filteredRows.forEach((row) => {
      const id = Number(row.employee?.id || 0);
      if (!id) return;
      const current = map.get(id) || {
        employee: row.employee,
        leaveType: row.leave_type?.name || "General",
        used: 0,
        total: 24,
      };

      const approved = String(row.status || "").toLowerCase() === "approved";
      current.used += approved ? Number(row.days || 1) : 0;
      current.leaveType = row.leave_type?.name || current.leaveType;
      map.set(id, current);
    });

    return Array.from(map.entries()).map(([employeeId, data]) => ({
      employeeId,
      name: data.employee?.full_name || `${data.employee?.first_name || ""} ${data.employee?.last_name || ""}`.trim() || "Employee",
      department: typeof data.employee?.department === "string" ? data.employee.department : data.employee?.department?.name || "Unassigned",
      leaveType: data.leaveType,
      used: data.used,
      total: data.total,
      remaining: Math.max(0, data.total - data.used),
    }));
  }, [filteredRows]);

  const employeeHistory = useMemo(() => {
    if (!activeEmployeeId) return [];
    return filteredRows.filter((row) => Number(row.employee?.id || 0) === activeEmployeeId);
  }, [activeEmployeeId, filteredRows]);

  const leaveTypes = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.leave_type?.name || "").filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const downloadCsv = () => {
    const headers = ["Employee", "Department", "Leave Type", "Total Leave", "Used", "Remaining"];
    const body = summaryRows.map((row) => [row.name, row.department, row.leaveType, row.total, row.used, row.remaining]);
    const csv = [headers.join(","), ...body.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leave-report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-indigo-600">Home</Link>
            <span className="mx-2">→</span>
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-700 font-semibold">Leave Report</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Leave Report</h1>
              <p className="text-sm text-slate-500">Leave usage, used vs remaining balance, and employee leave history.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all"><Download className="w-4 h-4" /> Export CSV</button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 transition-all"><FileText className="w-4 h-4" /> Export PDF</button>
            </div>
          </div>

          <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <label className="text-xs font-semibold uppercase text-slate-500">Employee Search<div className="mt-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm" /></div></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Department<select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">All</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Leave Type<select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">All</option>{leaveTypes.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">All</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold uppercase text-slate-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-3 flex justify-end"><button onClick={() => { setSearch(""); setDepartment(""); setLeaveType(""); setStatus(""); setFrom(""); setTo(""); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Filter className="w-4 h-4" /> Reset</button></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Leave Type</th><th className="px-4 py-3">Total Leave</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Remaining</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading leave report...</td></tr>
                  ) : summaryRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No leave data in selected scope.</td></tr>
                  ) : summaryRows.map((row, idx) => (
                    <tr key={row.employeeId} className="leave-row cursor-pointer hover:bg-indigo-50/40 transition-colors" style={{ animationDelay: `${idx * 35}ms` }} onClick={() => setActiveEmployeeId(row.employeeId)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.department}</td>
                      <td className="px-4 py-3">{row.leaveType}</td>
                      <td className="px-4 py-3">{row.total}</td>
                      <td className="px-4 py-3">{row.used}</td>
                      <td className="px-4 py-3">{row.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${activeEmployeeId ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setActiveEmployeeId(null)} />
        <div className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ${activeEmployeeId ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-bold text-slate-900">Employee Leave History</h3>
            <button onClick={() => setActiveEmployeeId(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {employeeHistory.length === 0 ? <p className="text-sm text-slate-500">No history found.</p> : (
              <div className="space-y-2">
                {employeeHistory.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">{row.leave_type?.name || "Leave"} • {row.days || 1} day(s)</p>
                    <p className="text-slate-600">{row.start_date} → {row.end_date}</p>
                    <p className="text-xs mt-1 text-slate-500">Status: {row.status || "pending"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .leave-row { opacity: 0; transform: translateY(6px); animation: rowIn 300ms ease-out forwards; }
          @keyframes rowIn { to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </RoleGate>
    </HRMSSidebar>
  );
}
