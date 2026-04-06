"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Calendar,
  Clock3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type AttendancePoint = { label: string; total_hours: number };

type CardStats = {
  totalEmployees: number;
  presentToday: number;
  totalHoursToday: number;
  pendingLeaves: number;
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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

const navTabs = [
  { label: "Dashboard", href: "/reports" },
  { label: "Attendance Report", href: "/reports/attendance" },
  { label: "Leave Report", href: "/reports/leave" },
  { label: "Employee Summary", href: "/reports/employees" },
  { label: "Department Analytics", href: "/reports/departments" },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [rangeType, setRangeType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [stats, setStats] = useState<CardStats>({
    totalEmployees: 0,
    presentToday: 0,
    totalHoursToday: 0,
    pendingLeaves: 0,
  });
  const [attendanceTrend, setAttendanceTrend] = useState<AttendancePoint[]>([]);
  const [leaveByDepartment, setLeaveByDepartment] = useState<Array<{ department: string; leave_days: number }>>([]);
  const [overtimeByDepartment, setOvertimeByDepartment] = useState<Array<{ department: string; overtime: number }>>([]);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleType, setScheduleType] = useState("dashboard");
  const [scheduleFrequency, setScheduleFrequency] = useState<"weekly" | "monthly">("monthly");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [employeesRes, leavesRes, attendanceSummaryRes, overtimeRes, attendancesRes] = await Promise.all([
        api.get("/api/v1/employees?per_page=500"),
        api.get("/api/v1/leave-requests?per_page=500"),
        api.get(`/api/v1/attendances/summary?type=${rangeType}`),
        api.get("/api/v1/overtimes?per_page=500"),
        api.get("/api/v1/attendances?per_page=500"),
      ]);

      const employees = extractArray<any>(employeesRes.data);
      const leaves = extractArray<any>(leavesRes.data);
      const attendances = extractArray<any>(attendancesRes.data);
      const overtimeRows = extractArray<any>(overtimeRes.data);

      const today = new Date().toISOString().split("T")[0];
      const presentToday = attendances.filter((row) => String(row.date || "").startsWith(today)).length;
      const totalHoursToday = attendances
        .filter((row) => String(row.date || "").startsWith(today))
        .reduce((acc, row) => acc + toNumber(row.total_hours), 0);
      const pendingLeaves = leaves.filter((row) => String(row.status || "").toLowerCase() === "pending").length;

      setStats({
        totalEmployees: employees.length,
        presentToday,
        totalHoursToday: Number(totalHoursToday.toFixed(2)),
        pendingLeaves,
      });

      const attendancePayload = attendanceSummaryRes.data?.data ?? attendanceSummaryRes.data;
      const trendRows = Array.isArray(attendancePayload?.trend)
        ? attendancePayload.trend
        : Array.isArray(attendancePayload)
          ? attendancePayload
          : [];
      setAttendanceTrend(
        trendRows.map((row: any, idx: number) => ({
          label: String(row.label || row.date || row.period || `P${idx + 1}`),
          total_hours: toNumber(row.total_hours || row.hours || row.total),
        }))
      );

      const leaveMap = new Map<string, number>();
      leaves.forEach((row) => {
        const dept =
          (typeof row.employee?.department === "string"
            ? row.employee.department
            : row.employee?.department?.name) || "Unassigned";
        const days = toNumber(row.days || row.total_days || 1);
        leaveMap.set(dept, (leaveMap.get(dept) || 0) + days);
      });
      setLeaveByDepartment(
        Array.from(leaveMap.entries()).map(([department, leave_days]) => ({ department, leave_days }))
      );

      const overtimeMap = new Map<string, number>();
      overtimeRows.forEach((row) => {
        const dept =
          (typeof row.employee?.department === "string"
            ? row.employee.department
            : row.employee?.department?.name) || "Unassigned";
        overtimeMap.set(dept, (overtimeMap.get(dept) || 0) + toNumber(row.hours || row.total_hours || row.overtime_hours));
      });
      setOvertimeByDepartment(
        Array.from(overtimeMap.entries()).map(([department, overtime]) => ({ department, overtime: Number(overtime.toFixed(2)) }))
      );
    } catch (err) {
      console.error("Failed to fetch reports dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeType]);

  const totalLeaveDays = useMemo(
    () => leaveByDepartment.reduce((acc, row) => acc + toNumber(row.leave_days), 0),
    [leaveByDepartment]
  );

  const totalOvertime = useMemo(
    () => overtimeByDepartment.reduce((acc, row) => acc + toNumber(row.overtime), 0),
    [overtimeByDepartment]
  );

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-indigo-600">Home</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-700 font-semibold">Reports</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">HR Reports Dashboard</h1>
              <p className="text-sm text-slate-500">Quick HR insights, trends, and report navigation.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-all"
              >
                <BellRing className="w-4 h-4" /> Schedule Report
              </button>
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            {navTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab.href === "/reports" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Employees", value: stats.totalEmployees, icon: Users, tone: "blue" },
              { label: "Present Today", value: stats.presentToday, icon: Calendar, tone: "emerald" },
              { label: "Total Hours Today", value: stats.totalHoursToday.toFixed(1), icon: Clock3, tone: "amber" },
              { label: "Pending Leave Requests", value: stats.pendingLeaves, icon: BellRing, tone: "rose" },
            ].map((card, idx) => (
              <div
                key={card.label}
                className={`fade-card rounded-2xl border bg-white p-4 shadow-sm ${card.tone === "blue" ? "border-blue-100" : card.tone === "emerald" ? "border-emerald-100" : card.tone === "amber" ? "border-amber-100" : "border-rose-100"}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase font-semibold text-slate-500">{card.label}</p>
                  <card.icon className="w-4 h-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Attendance Hours Trend</h3>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                {(["daily", "weekly", "monthly"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setRangeType(type)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${rangeType === type ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total_hours" stroke="#4f46e5" strokeWidth={2} dot={false} isAnimationActive animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Leave Usage by Department</h3>
                <span className="text-xs text-slate-500">Total {totalLeaveDays.toFixed(1)} days</span>
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={leaveByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="leave_days" fill="#6366f1" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={500} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Overtime Distribution</h3>
                <span className="text-xs text-slate-500">Total {totalOvertime.toFixed(1)} hrs</span>
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={overtimeByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="overtime" fill="#f59e0b" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={500} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 transition-all">
              <FileText className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>

        <div
          className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${scheduleModalOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setScheduleModalOpen(false)}
        />
        <div className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${scheduleModalOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs uppercase font-semibold text-emerald-600">Scheduled Report</p>
              <h3 className="text-lg font-bold text-slate-900">Configure Delivery</h3>
            </div>
            <button onClick={() => setScheduleModalOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <label className="block text-sm">
              <span className="text-xs uppercase font-semibold text-slate-500">Report Type</span>
              <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="dashboard">Reports Dashboard</option>
                <option value="attendance">Attendance Report</option>
                <option value="leave">Leave Report</option>
                <option value="employees">Employee Summary</option>
                <option value="departments">Department Analytics</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase font-semibold text-slate-500">Frequency</span>
              <select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value as "weekly" | "monthly")} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase font-semibold text-slate-500">Email Recipients</span>
              <input value={scheduleEmail} onChange={(e) => setScheduleEmail(e.target.value)} placeholder="hr@company.com, admin@company.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </label>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button onClick={() => setScheduleModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => setScheduleModalOpen(false)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .fade-card {
            opacity: 0;
            transform: translateY(8px);
            animation: cardIn 360ms ease-out forwards;
          }

          @keyframes cardIn {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </RoleGate>
    </HRMSSidebar>
  );
}
