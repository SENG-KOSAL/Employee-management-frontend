"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type EmployeeRow = {
  id: number;
  department?: string | { name?: string };
  status?: string;
};

type LeaveRow = {
  id: number;
  days?: number;
  status?: string;
  employee?: { department?: string | { name?: string } };
};

type AttendanceRow = {
  id: number;
  total_hours?: number;
  employee?: { department?: string | { name?: string } };
};

type OvertimeRow = {
  id: number;
  hours?: number;
  overtime_hours?: number;
  employee?: { department?: string | { name?: string } };
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

const getDept = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return (value as any).name || "Unassigned";
  return "Unassigned";
};

export default function DepartmentAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRow[]>([]);
  const [overtimeRows, setOvertimeRows] = useState<OvertimeRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [empRes, leaveRes, attRes, otRes] = await Promise.all([
          api.get("/api/v1/employees?per_page=800"),
          api.get("/api/v1/leave-requests?per_page=800"),
          api.get("/api/v1/attendances?per_page=800"),
          api.get("/api/v1/overtimes?per_page=800"),
        ]);

        setEmployees(extractArray<EmployeeRow>(empRes.data));
        setLeaves(extractArray<LeaveRow>(leaveRes.data));
        setAttendances(extractArray<AttendanceRow>(attRes.data));
        setOvertimeRows(extractArray<OvertimeRow>(otRes.data));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const tableRows = useMemo(() => {
    const map = new Map<string, { employees: number; totalAttendance: number; attendanceRows: number; totalLeave: number; totalOvertime: number }>();

    employees.forEach((row) => {
      const dept = getDept(row.department);
      const current = map.get(dept) || { employees: 0, totalAttendance: 0, attendanceRows: 0, totalLeave: 0, totalOvertime: 0 };
      current.employees += 1;
      map.set(dept, current);
    });

    attendances.forEach((row) => {
      const dept = getDept(row.employee?.department);
      const current = map.get(dept) || { employees: 0, totalAttendance: 0, attendanceRows: 0, totalLeave: 0, totalOvertime: 0 };
      current.totalAttendance += toNumber(row.total_hours);
      current.attendanceRows += 1;
      map.set(dept, current);
    });

    leaves.forEach((row) => {
      const dept = getDept(row.employee?.department);
      const current = map.get(dept) || { employees: 0, totalAttendance: 0, attendanceRows: 0, totalLeave: 0, totalOvertime: 0 };
      current.totalLeave += toNumber(row.days || 1);
      map.set(dept, current);
    });

    overtimeRows.forEach((row) => {
      const dept = getDept(row.employee?.department);
      const current = map.get(dept) || { employees: 0, totalAttendance: 0, attendanceRows: 0, totalLeave: 0, totalOvertime: 0 };
      current.totalOvertime += toNumber(row.hours || row.overtime_hours);
      map.set(dept, current);
    });

    return Array.from(map.entries()).map(([department, info]) => ({
      department,
      employees: info.employees,
      avgAttendance: info.attendanceRows ? Number((info.totalAttendance / info.attendanceRows).toFixed(2)) : 0,
      totalLeave: Number(info.totalLeave.toFixed(2)),
      totalOvertime: Number(info.totalOvertime.toFixed(2)),
    }));
  }, [employees, attendances, leaves, overtimeRows]);

  const employeesChart = useMemo(() => tableRows.map((row) => ({ department: row.department, employees: row.employees })), [tableRows]);
  const leaveChart = useMemo(() => tableRows.map((row) => ({ department: row.department, totalLeave: row.totalLeave })), [tableRows]);

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="text-xs text-slate-500"><Link href="/dashboard" className="hover:text-indigo-600">Home</Link><span className="mx-2">→</span><Link href="/reports" className="hover:text-indigo-600">Reports</Link><span className="mx-2">→</span><span className="text-slate-700 font-semibold">Department Analytics</span></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Department Analytics</h1>
            <p className="text-sm text-slate-500">Workforce, attendance, leave, and overtime performance by department.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Department</th><th className="px-4 py-3">Employees</th><th className="px-4 py-3">Avg Attendance</th><th className="px-4 py-3">Total Leave</th><th className="px-4 py-3">Total Overtime</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading analytics...</td></tr> : tableRows.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No department analytics data.</td></tr> : tableRows.map((row, idx) => (
                    <tr key={row.department} className="dept-row hover:bg-indigo-50/40 transition-colors" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.department}</td>
                      <td className="px-4 py-3">{row.employees}</td>
                      <td className="px-4 py-3">{row.avgAttendance}</td>
                      <td className="px-4 py-3">{row.totalLeave}</td>
                      <td className="px-4 py-3">{row.totalOvertime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Employees per Department</h3>
              <div className="h-64">{loading ? <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" /> : <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={employeesChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="department" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="employees" fill="#4f46e5" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={450} /></BarChart></ResponsiveContainer>}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Leave Usage per Department</h3>
              <div className="h-64">{loading ? <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" /> : <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={leaveChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="department" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="totalLeave" fill="#f59e0b" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={450} /></BarChart></ResponsiveContainer>}</div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .dept-row { opacity: 0; transform: translateY(6px); animation: rowIn 300ms ease-out forwards; }
          @keyframes rowIn { to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </RoleGate>
    </HRMSSidebar>
  );
}
