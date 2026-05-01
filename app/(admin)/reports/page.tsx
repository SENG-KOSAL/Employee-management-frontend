"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar, Clock3, Download, Landmark, Layers3, Sparkles, Trophy, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type ReportTab = "overview" | "attendance" | "leave" | "payroll" | "overtime" | "performance" | "department" | "insights";
type EmployeeRow = { id: number; name: string; department: string; hours: number; overtime: number; leavesTaken: number; remainingLeaves: number; baseSalary: number; deductions: number; netSalary: number; attendancePct: number; lateFrequency: number; consistency: number };

type Row = Record<string, unknown>;

const TABS: Array<{ id: ReportTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave" },
  { id: "payroll", label: "Payroll" },
  { id: "overtime", label: "Overtime" },
  { id: "performance", label: "Performance" },
  { id: "department", label: "Department" },
  { id: "insights", label: "Insights" },
];

function useAnimatedNumber(value: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = Math.max(1, Math.round(duration / 16));
    const from = display;
    const diff = value - from;
    const timer = setInterval(() => {
      frame += 1;
      const t = Math.min(1, frame / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + diff * eased));
      if (t >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

const money = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toArray = (payload: unknown): Row[] => {
  if (Array.isArray(payload)) return payload as Row[];
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Row[];
  if (root.data && typeof root.data === "object" && Array.isArray((root.data as Record<string, unknown>).data)) {
    return (root.data as Record<string, unknown>).data as Row[];
  }
  return [];
};

const getEmployeeName = (row: Row) => {
  const directName = typeof row.name === "string" ? row.name : "";
  if (directName.trim()) return directName;

  const first = typeof row.first_name === "string" ? row.first_name : "";
  const last = typeof row.last_name === "string" ? row.last_name : "";
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const employee = row.employee as Row | undefined;
  if (employee) {
    const employeeName = typeof employee.full_name === "string" ? employee.full_name : typeof employee.name === "string" ? employee.name : "";
    if (employeeName.trim()) return employeeName;
    const ef = typeof employee.first_name === "string" ? employee.first_name : "";
    const el = typeof employee.last_name === "string" ? employee.last_name : "";
    const eFull = `${ef} ${el}`.trim();
    if (eFull) return eFull;
  }

  return "Unknown Employee";
};

const getDepartmentName = (row: Row) => {
  const direct = row.department;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (direct && typeof direct === "object") {
    const depObj = direct as Row;
    if (typeof depObj.name === "string" && depObj.name.trim()) return depObj.name;
  }
  const employee = row.employee as Row | undefined;
  const employeeDep = employee?.department;
  if (typeof employeeDep === "string" && employeeDep.trim()) return employeeDep;
  if (employeeDep && typeof employeeDep === "object") {
    const depObj = employeeDep as Row;
    if (typeof depObj.name === "string" && depObj.name.trim()) return depObj.name;
  }
  return "Unassigned";
};

const getEmployeeId = (row: Row): number => {
  if (typeof row.id === "number") return row.id;
  if (typeof row.id === "string") return Number(row.id) || 0;
  if (typeof row.employee_id === "number") return row.employee_id;
  if (typeof row.employee_id === "string") return Number(row.employee_id) || 0;
  const employee = row.employee as Row | undefined;
  if (employee) {
    if (typeof employee.id === "number") return employee.id;
    if (typeof employee.id === "string") return Number(employee.id) || 0;
  }
  return 0;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeesData, setEmployeesData] = useState<Row[]>([]);
  const [attendancesData, setAttendancesData] = useState<Row[]>([]);
  const [leavesData, setLeavesData] = useState<Row[]>([]);
  const [overtimesData, setOvertimesData] = useState<Row[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [employeesRes, attendancesRes, leavesRes, overtimesRes] = await Promise.allSettled([
          api.get("/api/v1/employees?per_page=500"),
          api.get("/api/v1/attendances?per_page=1000"),
          api.get("/api/v1/leave-requests?per_page=1000"),
          api.get("/api/v1/overtimes?per_page=1000"),
        ]);

        if (employeesRes.status === "fulfilled") setEmployeesData(toArray(employeesRes.value.data));
        if (attendancesRes.status === "fulfilled") setAttendancesData(toArray(attendancesRes.value.data));
        if (leavesRes.status === "fulfilled") setLeavesData(toArray(leavesRes.value.data));
        if (overtimesRes.status === "fulfilled") setOvertimesData(toArray(overtimesRes.value.data));

        if (
          employeesRes.status === "rejected" ||
          attendancesRes.status === "rejected" ||
          leavesRes.status === "rejected" ||
          overtimesRes.status === "rejected"
        ) {
          setError("Some report sources could not be loaded. Showing available data.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports data.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const employeesRows = useMemo<EmployeeRow[]>(() => {
    const monthPrefix = `${monthFilter}-`;

    return employeesData.map((employee) => {
      const id = getEmployeeId(employee);
      const name = getEmployeeName(employee);
      const department = getDepartmentName(employee);
      const baseSalary = toNumber(employee.salary);

      const employeeAttendances = attendancesData.filter((a) => {
        const attendanceEmployeeId = getEmployeeId(a);
        const date = typeof a.date === "string" ? a.date : "";
        return attendanceEmployeeId === id && date.startsWith(monthPrefix);
      });

      const employeeOvertimes = overtimesData.filter((o) => {
        const overtimeEmployeeId = getEmployeeId(o);
        const date = typeof o.date === "string" ? o.date : "";
        return overtimeEmployeeId === id && date.startsWith(monthPrefix);
      });

      const employeeLeaves = leavesData.filter((l) => {
        const leaveEmployeeId = getEmployeeId(l);
        const start = typeof l.start_date === "string" ? l.start_date : "";
        const created = typeof l.created_at === "string" ? l.created_at : "";
        return leaveEmployeeId === id && (start.startsWith(monthPrefix) || created.startsWith(monthPrefix));
      });

      const hours = employeeAttendances.reduce((sum, a) => sum + toNumber(a.total_hours), 0);
      const overtime = employeeOvertimes.reduce((sum, o) => sum + toNumber(o.hours ?? o.total_hours ?? o.overtime_hours), 0);
      const leavesTaken = employeeLeaves.length;
      const remainingLeaves = Math.max(0, 12 - leavesTaken);
      const presentCount = employeeAttendances.filter((a) => String(a.status || "").toLowerCase() === "present").length;
      const lateCount = employeeAttendances.filter((a) => String(a.status || "").toLowerCase() === "late").length;
      const attendancePct = employeeAttendances.length > 0 ? Math.round((presentCount / employeeAttendances.length) * 100) : 0;
      const deductions = Math.max(0, leavesTaken * 5 + lateCount * 2);
      const netSalary = Math.max(0, baseSalary + overtime * 8 - deductions);
      const consistency = Math.max(0, Math.min(100, attendancePct - lateCount * 2));

      return {
        id,
        name,
        department,
        hours,
        overtime,
        leavesTaken,
        remainingLeaves,
        baseSalary,
        deductions,
        netSalary,
        attendancePct,
        lateFrequency: lateCount,
        consistency,
      };
    });
  }, [attendancesData, employeesData, leavesData, monthFilter, overtimesData]);

  const filtered = useMemo(() => employeesRows.filter((e) => (employeeFilter === "all" || String(e.id) === employeeFilter) && (departmentFilter === "all" || e.department === departmentFilter)), [employeeFilter, departmentFilter, employeesRows]);
  const stats = useMemo(() => ({ totalEmployees: filtered.length, presentToday: filtered.filter((e) => e.attendancePct >= 90).length, totalHours: filtered.reduce((s, e) => s + e.hours, 0), totalPayroll: filtered.reduce((s, e) => s + e.netSalary, 0) }), [filtered]);

  const totalEmployees = useAnimatedNumber(stats.totalEmployees);
  const presentToday = useAnimatedNumber(stats.presentToday);
  const totalHours = useAnimatedNumber(stats.totalHours);
  const totalPayroll = useAnimatedNumber(stats.totalPayroll);

  const trend = [{ day: "Mon", value: 91 }, { day: "Tue", value: 93 }, { day: "Wed", value: 89 }, { day: "Thu", value: 95 }, { day: "Fri", value: 94 }];
  const topLate = [...filtered].sort((a, b) => b.lateFrequency - a.lateFrequency).slice(0, 5);
  const topBest = [...filtered].sort((a, b) => b.consistency - a.consistency).slice(0, 5);

  const departmentRows = useMemo(() => {
    const map = new Map<string, { department: string; employees: number; hours: number; overtime: number }>();
    filtered.forEach((e) => {
      const row = map.get(e.department) || { department: e.department, employees: 0, hours: 0, overtime: 0 };
      row.employees += 1;
      row.hours += e.hours;
      row.overtime += e.overtime;
      map.set(e.department, row);
    });
    return Array.from(map.values());
  }, [filtered]);

  const exportCurrent = (format: "pdf" | "excel") => {
    const blob = new Blob([`Tab: ${activeTab}\nMonth: ${monthFilter}\nRows: ${filtered.length}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-report-${activeTab}-${monthFilter}.${format === "excel" ? "csv" : "txt"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="text-xs text-slate-500"><Link href="/dashboard" className="hover:text-indigo-600">Home</Link><span className="mx-2">→</span><span className="font-semibold text-slate-700">Reports</span></div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-2xl font-bold text-slate-900">Employee Management • Report Module</h1><p className="text-sm text-slate-500">Employee-centric reporting with smooth motion and modern analytics.</p></div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Dashboard</Link>
              <Link href="/employees" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Employee</Link>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">📊 Report</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All Employees</option>{employeesRows.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}</select>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All Departments</option>{Array.from(new Set(employeesRows.map((e) => e.department))).map((d) => <option key={d} value={d}>{d}</option>)}</select>
            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading reports data...</div>
          )}
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[{ label: "Total Employees", value: totalEmployees, icon: Users }, { label: "Present Today", value: presentToday, icon: Calendar }, { label: "Total Hours", value: totalHours, icon: Clock3 }, { label: "Total Payroll", value: money(totalPayroll), icon: Landmark }].map((card, i) => (
              <div key={card.label} className="rounded-2xl border bg-white p-4 shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between"><p className="text-xs uppercase font-semibold text-slate-500">{card.label}</p><card.icon className="h-4 w-4 text-slate-400" /></div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-2"><div className="flex flex-wrap gap-2">{TABS.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{tab.label}</button>)}</div></div>

          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-indigo-600" /><h3 className="text-base font-semibold text-slate-800">{TABS.find((t) => t.id === activeTab)?.label} Report</h3></div><div className="flex gap-2"><button onClick={() => exportCurrent("pdf")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><Download className="h-4 w-4" /> PDF</button><button onClick={() => exportCurrent("excel")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><Download className="h-4 w-4" /> Excel</button></div></div>

            {activeTab === "overview" && <div className="grid gap-4 lg:grid-cols-2"><div className="grid grid-cols-2 gap-3">{[{ title: "Total Hours", value: stats.totalHours, icon: Clock3 }, { title: "Overtime", value: filtered.reduce((s, e) => s + e.overtime, 0), icon: BarChart3 }, { title: "Leaves Taken", value: filtered.reduce((s, e) => s + e.leavesTaken, 0), icon: Calendar }, { title: "Salary", value: money(filtered.reduce((s, e) => s + e.netSalary, 0)), icon: Landmark }].map((item) => <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between text-slate-500"><span className="text-xs uppercase font-semibold">{item.title}</span><item.icon className="h-4 w-4" /></div><div className="mt-2 text-xl font-bold text-slate-900">{item.value}</div></div>)}</div><div className="h-64 rounded-xl border border-slate-100 p-2"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#g1)" isAnimationActive animationDuration={900} /></AreaChart></ResponsiveContainer></div></div>}

            {activeTab === "attendance" && <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Check-in/out</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Total Hours</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((e, i) => { const status = e.lateFrequency >= 6 ? "Late" : e.attendancePct < 90 ? "Absent" : "Present"; return <tr key={e.id} className="animate-in fade-in duration-300 hover:bg-slate-50" style={{ animationDelay: `${i * 45}ms` }}><td className="px-3 py-2">{e.name}</td><td className="px-3 py-2">{monthFilter}-15</td><td className="px-3 py-2">08:00 / 17:30</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === "Present" ? "bg-emerald-50 text-emerald-700" : status === "Late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{status}</span></td><td className="px-3 py-2 text-right font-semibold">{e.hours}</td></tr>; })}</tbody></table></div>}

            {activeTab === "leave" && <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs uppercase font-semibold text-slate-500">Total Leaves Taken</p><p className="mt-1 text-2xl font-bold text-slate-900">{filtered.reduce((s, e) => s + e.leavesTaken, 0)}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs uppercase font-semibold text-slate-500">Remaining Leaves</p><p className="mt-1 text-2xl font-bold text-slate-900">{filtered.reduce((s, e) => s + e.remainingLeaves, 0)}</p></div></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Leave Type</th><th className="px-3 py-2 text-left">Start/End</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Reason</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((e, i) => <tr key={e.id} className="animate-in fade-in duration-300" style={{ animationDelay: `${i * 45}ms` }}><td className="px-3 py-2">{e.name}</td><td className="px-3 py-2">Annual</td><td className="px-3 py-2">{monthFilter}-10 → {monthFilter}-12</td><td className="px-3 py-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Approved</span></td><td className="px-3 py-2">Personal</td></tr>)}</tbody></table></div></div>}

            {activeTab === "payroll" && <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-right">Base Salary</th><th className="px-3 py-2 text-right">Overtime</th><th className="px-3 py-2 text-right">Deduction</th><th className="px-3 py-2 text-right">Net Salary</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((e, i) => <tr key={e.id} className="animate-in fade-in duration-300" style={{ animationDelay: `${i * 45}ms` }}><td className="px-3 py-2">{e.name}</td><td className="px-3 py-2 text-right">{money(e.baseSalary)}</td><td className="px-3 py-2 text-right">{money(e.overtime * 8)}</td><td className="px-3 py-2 text-right">{money(e.deductions)}</td><td className="px-3 py-2 text-right font-bold text-emerald-700">{money(e.netSalary)}</td></tr>)}</tbody></table></div>}

            {activeTab === "overtime" && <div className="space-y-3">{filtered.map((e) => { const ratio = Math.min(100, (e.overtime / 20) * 100); return <div key={e.id} className="rounded-xl border border-slate-100 p-3"><div className="mb-2 flex justify-between"><span className="text-sm font-medium text-slate-700">{e.name}</span><span className="text-xs text-slate-500">{e.overtime} hrs</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700" style={{ width: `${ratio}%` }} /></div></div>; })}</div>}

            {activeTab === "performance" && <div className="h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart data={filtered.map((e) => ({ name: e.name.split(" ")[0], consistency: e.consistency }))}><PolarGrid /><PolarAngleAxis dataKey="name" /><PolarRadiusAxis domain={[0, 100]} /><Radar dataKey="consistency" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} isAnimationActive animationDuration={1000} /><Tooltip /></RadarChart></ResponsiveContainer></div>}

            {activeTab === "department" && <div className="grid gap-4 lg:grid-cols-2"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={departmentRows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="department" /><YAxis /><Tooltip /><Bar dataKey="employees" fill="#2563eb" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} /></BarChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Department</th><th className="px-3 py-2 text-right">Employees</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-right">Overtime</th></tr></thead><tbody className="divide-y divide-slate-100">{departmentRows.map((d) => <tr key={d.department}><td className="px-3 py-2">{d.department}</td><td className="px-3 py-2 text-right">{d.employees}</td><td className="px-3 py-2 text-right">{d.hours}</td><td className="px-3 py-2 text-right">{d.overtime}</td></tr>)}</tbody></table></div></div>}

            {activeTab === "insights" && <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><div className="mb-2 flex items-center gap-2 text-amber-700"><Trophy className="h-4 w-4" /><h4 className="font-semibold">Top 5 Late Employees</h4></div><ul className="space-y-1 text-sm text-slate-700">{topLate.map((e) => <li key={e.id} className="flex justify-between"><span>{e.name}</span><span>{e.lateFrequency}x</span></li>)}</ul></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="mb-2 flex items-center gap-2 text-emerald-700"><Sparkles className="h-4 w-4" /><h4 className="font-semibold">Top 5 Best Employees</h4></div><ul className="space-y-1 text-sm text-slate-700">{topBest.map((e) => <li key={e.id} className="flex justify-between"><span>{e.name}</span><span>{e.consistency}%</span></li>)}</ul></div><div className="h-56 rounded-xl border border-slate-100 bg-white p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={filtered.map((e) => ({ name: e.name.split(" ")[0], attendance: e.attendancePct, salary: e.netSalary / 20 }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line dataKey="attendance" stroke="#3b82f6" strokeWidth={2} isAnimationActive animationDuration={900} /><Line dataKey="salary" stroke="#10b981" strokeWidth={2} isAnimationActive animationDuration={900} /></LineChart></ResponsiveContainer></div></div>}
          </div>
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
