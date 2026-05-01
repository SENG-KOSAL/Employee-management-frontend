"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, FileSpreadsheet, FileText, Filter, Sparkles } from "lucide-react";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type GenericRow = Record<string, unknown>;
type TabKey = "employees" | "attendance" | "compensation" | "insights";
type RangeKey = "day" | "week" | "month";

type EmployeeRow = {
  id: number;
  name: string;
  department: string;
  position: string;
  salary: number;
  status: string;
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

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const getEmployeeId = (row: GenericRow) => {
  if (typeof row.id === "number") return row.id;
  if (typeof row.id === "string") return Number(row.id) || 0;
  if (typeof row.employee_id === "number") return row.employee_id;
  if (typeof row.employee_id === "string") return Number(row.employee_id) || 0;
  const employee = row.employee;
  if (employee && typeof employee === "object") {
    const id = (employee as GenericRow).id;
    if (typeof id === "number") return id;
    if (typeof id === "string") return Number(id) || 0;
  }
  return 0;
};

const getName = (row: GenericRow): string => {
  if (typeof row.full_name === "string" && row.full_name.trim()) return row.full_name;
  if (typeof row.name === "string" && row.name.trim()) return row.name;
  const first = typeof row.first_name === "string" ? row.first_name : "";
  const last = typeof row.last_name === "string" ? row.last_name : "";
  const full = `${first} ${last}`.trim();
  return full || "Employee";
};

const getDepartment = (row: GenericRow): string => {
  const dep = row.department;
  if (typeof dep === "string" && dep.trim()) return dep;
  if (dep && typeof dep === "object") {
    const name = (dep as GenericRow).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return "Unassigned";
};

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function EmployeeReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("employees");
  const [range, setRange] = useState<RangeKey>("month");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);
  const [leaveRows, setLeaveRows] = useState<GenericRow[]>([]);
  const [overtimeRows, setOvertimeRows] = useState<GenericRow[]>([]);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
    setEmployeeFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
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

        const [employeesRes, attendanceRes, leaveRes, overtimeRes] = await Promise.allSettled([
          api.get("/api/v1/employees?per_page=800"),
          api.get("/api/v1/attendances?per_page=2500"),
          api.get("/api/v1/leave-requests?per_page=2500"),
          api.get("/api/v1/overtimes?per_page=2500"),
        ]);

        const employeePayload = employeesRes.status === "fulfilled" ? toArray(employeesRes.value.data) : [];
        const mappedEmployees: EmployeeRow[] = employeePayload.map((row) => ({
          id: getEmployeeId(row),
          name: getName(row),
          department: getDepartment(row),
          position: String(row.position || row.job_title || "-"),
          salary: toNumber(row.salary),
          status: String(row.status || "active").toLowerCase(),
        }));

        setEmployees(mappedEmployees);
        setAttendanceRows(attendanceRes.status === "fulfilled" ? toArray(attendanceRes.value.data) : []);
        setLeaveRows(leaveRes.status === "fulfilled" ? toArray(leaveRes.value.data) : []);
        setOvertimeRows(overtimeRes.status === "fulfilled" ? toArray(overtimeRes.value.data) : []);

        if (
          employeesRes.status === "rejected" ||
          attendanceRes.status === "rejected" ||
          leaveRes.status === "rejected" ||
          overtimeRes.status === "rejected"
        ) {
          setError("Some data sources failed to load. Showing available report data.");
        }
      } catch {
        setError("Unable to load employee management report module.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort((a, b) => a.localeCompare(b)),
    [employees]
  );

  const inDateRange = (date: string) => {
    if (!date) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((row) => {
      if (employeeFilter !== "all" && String(row.id) !== employeeFilter) return false;
      if (departmentFilter !== "all" && row.department !== departmentFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [employees, employeeFilter, departmentFilter, statusFilter]);

  const employeeIdSet = useMemo(() => new Set(filteredEmployees.map((e) => e.id)), [filteredEmployees]);

  const attendanceFiltered = useMemo(() => {
    return attendanceRows.filter((row) => {
      const id = getEmployeeId(row);
      const date = formatDate(row.date ?? row.attendance_date ?? row.created_at);
      if (!employeeIdSet.has(id)) return false;
      if (!inDateRange(date)) return false;
      return true;
    });
  }, [attendanceRows, employeeIdSet, fromDate, toDate]);

  const leaveFiltered = useMemo(() => {
    return leaveRows.filter((row) => {
      const id = getEmployeeId(row);
      const date = formatDate(row.start_date ?? row.from_date ?? row.created_at);
      if (!employeeIdSet.has(id)) return false;
      if (!inDateRange(date)) return false;
      return true;
    });
  }, [leaveRows, employeeIdSet, fromDate, toDate]);

  const overtimeFiltered = useMemo(() => {
    return overtimeRows.filter((row) => {
      const id = getEmployeeId(row);
      const date = formatDate(row.date ?? row.created_at);
      if (!employeeIdSet.has(id)) return false;
      if (!inDateRange(date)) return false;
      return true;
    });
  }, [overtimeRows, employeeIdSet, fromDate, toDate]);

  const today = new Date().toISOString().slice(0, 10);
  const attendanceToday = attendanceFiltered.filter((row) => formatDate(row.date ?? row.attendance_date ?? row.created_at) === today);

  const presentToday = attendanceToday.filter((row) => String(row.status || "").toLowerCase() === "present").length;
  const absentToday = attendanceToday.filter((row) => String(row.status || "").toLowerCase() === "absent").length;
  const lateToday = attendanceToday.filter((row) => String(row.status || "").toLowerCase() === "late").length;

  const totals = {
    employees: filteredEmployees.length,
    active: filteredEmployees.filter((r) => r.status === "active").length,
    inactive: filteredEmployees.filter((r) => r.status !== "active").length,
    payroll: filteredEmployees.reduce((sum, row) => sum + row.salary, 0),
    overtime: overtimeFiltered.reduce((sum, row) => sum + toNumber(row.hours ?? row.total_hours ?? row.overtime_hours), 0),
  };

  const animated = {
    employees: useCountUp(totals.employees),
    active: useCountUp(totals.active),
    inactive: useCountUp(totals.inactive),
    payroll: useCountUp(totals.payroll),
    overtime: useCountUp(totals.overtime),
  };

  const trend = useMemo(() => {
    const map = new Map<string, { label: string; present: number; late: number; absent: number }>();
    attendanceFiltered.forEach((row) => {
      const date = formatDate(row.date ?? row.attendance_date ?? row.created_at);
      if (!date) return;
      const status = String(row.status || "").toLowerCase();
      const base = map.get(date) || { label: date.slice(5), present: 0, late: 0, absent: 0 };
      if (status === "late") base.late += 1;
      else if (status === "absent") base.absent += 1;
      else base.present += 1;
      map.set(date, base);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([, value]) => value);
  }, [attendanceFiltered]);

  const departmentChart = useMemo(() => {
    const map = new Map<string, number>();
    filteredEmployees.forEach((row) => map.set(row.department, (map.get(row.department) || 0) + 1));
    return Array.from(map.entries())
      .map(([department, employeesCount]) => ({ department, employeesCount }))
      .sort((a, b) => b.employeesCount - a.employeesCount)
      .slice(0, 8);
  }, [filteredEmployees]);

  const topLateEmployees = useMemo(() => {
    const map = new Map<number, number>();
    attendanceFiltered.forEach((row) => {
      if (String(row.status || "").toLowerCase() !== "late") return;
      const id = getEmployeeId(row);
      map.set(id, (map.get(id) || 0) + 1);
    });

    const byId = new Map(filteredEmployees.map((row) => [row.id, row.name]));
    return Array.from(map.entries())
      .map(([id, lateCount]) => ({
        name: byId.get(id) || `Employee ${id}`,
        lateCount,
      }))
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);
  }, [attendanceFiltered, filteredEmployees]);

  const exportEmployeesExcel = () => {
    const lines: string[] = [];
    lines.push(["Employee", "Department", "Position", "Status", "Salary"].map(csvCell).join(","));
    filteredEmployees.forEach((row) => {
      lines.push([row.name, row.department, row.position, row.status, row.salary].map(csvCell).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
    const popup = window.open("", "_blank");
    if (!popup) return;

    const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
    const rowsHtml = rows
      .slice(0, 250)
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("");

    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #3B82F6; color: #fff; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="mx-auto max-w-7xl space-y-6 pb-10">
          <div className="text-xs text-slate-500">
            <Link href="/dashboard" className="hover:text-blue-700">
              Dashboard
            </Link>
            <span className="mx-2">→</span>
            <span className="font-semibold text-slate-700">📊 Employee Management Report Module</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employee Management → Report Module</h1>
              <p className="text-sm text-slate-600">Friendly daily/monthly employee analytics with exports and quick insights.</p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { id: "employees", label: "Employee Report" },
                { id: "attendance", label: "Attendance Snapshot" },
                { id: "compensation", label: "Compensation" },
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
              <button onClick={clearFilters} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                Reset filters
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Employee</span>
                <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All Employees</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={String(employee.id)}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Department</span>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All Departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

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
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">From</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">To</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>

              <div className="col-span-2 space-y-1">
                <span className="text-xs font-medium text-slate-600">Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setRange("day"); applyDatePreset(0); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Today</button>
                  <button onClick={() => { setRange("week"); applyDatePreset(6); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Last 7 days</button>
                  <button onClick={() => { setRange("month"); applyDatePreset(29); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Last 30 days</button>
                </div>
              </div>
            </div>
          </div>

          {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading employee report...</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {activeTab === "employees" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { title: "Total Employees", value: animated.employees },
                  { title: "Active", value: animated.active },
                  { title: "Inactive", value: animated.inactive },
                  { title: "Total Payroll", value: money(animated.payroll) },
                  { title: "Overtime Hours", value: animated.overtime },
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

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Employee Table</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportPdf(
                        "Employee Management Report",
                        ["Employee", "Department", "Position", "Status", "Salary"],
                        filteredEmployees.map((r) => [r.name, r.department, r.position, r.status, r.salary])
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
                    <FileText className="h-4 w-4" /> PDF
                  </button>
                  <button onClick={exportEmployeesExcel} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600">
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-500 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                        <th className="px-4 py-3 text-left font-semibold">Position</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No employees found.</td>
                        </tr>
                      ) : (
                        filteredEmployees.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                            style={{ transitionDelay: `${Math.min(idx * 12, 240)}ms` }}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                            <td className="px-4 py-3">{row.department}</td>
                            <td className="px-4 py-3">{row.position}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white ${row.status === "active" ? "bg-emerald-500" : "bg-red-500"}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{money(row.salary)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "attendance" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Attendance Snapshot ({range === "day" ? "Daily" : range === "week" ? "Weekly" : "Monthly"})</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  <CalendarDays className="h-3.5 w-3.5" /> Today: P {presentToday} / A {absentToday} / L {lateToday}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Attendance Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#64748B" />
                        <YAxis stroke="#64748B" allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="present" stroke="#3B82F6" strokeWidth={3} animationDuration={900} />
                        <Line type="monotone" dataKey="late" stroke="#EF4444" strokeWidth={2} animationDuration={1000} />
                        <Line type="monotone" dataKey="absent" stroke="#10B981" strokeWidth={2} animationDuration={1100} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Department Employees</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentChart}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="department" stroke="#64748B" />
                        <YAxis stroke="#64748B" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="employeesCount" fill="#3B82F6" radius={[8, 8, 0, 0]} animationDuration={950} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "compensation" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 -rotate-1 opacity-0"}`}>
                  <div className="text-xs font-semibold uppercase text-slate-500">Total Payroll</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{money(totals.payroll)}</div>
                </div>
                <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 rotate-1 opacity-0"}`}>
                  <div className="text-xs font-semibold uppercase text-slate-500">Overtime Hours</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{totals.overtime.toFixed(2)}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-500 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Salary</th>
                        <th className="px-4 py-3 text-left font-semibold">Leave Requests</th>
                        <th className="px-4 py-3 text-left font-semibold">Overtime Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No compensation data found.</td></tr>
                      ) : (
                        filteredEmployees.map((employee, idx) => {
                          const leaveCount = leaveFiltered.filter((row) => getEmployeeId(row) === employee.id).length;
                          const overtimeHours = overtimeFiltered
                            .filter((row) => getEmployeeId(row) === employee.id)
                            .reduce((sum, row) => sum + toNumber(row.hours ?? row.total_hours ?? row.overtime_hours), 0);

                          return (
                            <tr key={employee.id} className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${ready ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${Math.min(idx * 12, 240)}ms` }}>
                              <td className="px-4 py-3 font-medium text-slate-900">{employee.name}</td>
                              <td className="px-4 py-3">{money(employee.salary)}</td>
                              <td className="px-4 py-3">{leaveCount}</td>
                              <td className="px-4 py-3">{overtimeHours.toFixed(2)}</td>
                            </tr>
                          );
                        })
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
                <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <Sparkles className="h-4 w-4" /> Top 5 Late Employees
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topLateEmployees.length === 0 ? (
                      <span className="text-sm text-slate-500">No late patterns in selected filter.</span>
                    ) : (
                      topLateEmployees.map((item, idx) => (
                        <span key={item.name} className={`rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-all duration-500 ${ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`} style={{ transitionDelay: `${idx * 70}ms` }}>
                          {item.name} • {item.lateCount}x
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Export Center</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => exportPdf("Employee Management Insight Report", ["Employee", "Department", "Position", "Status", "Salary"], filteredEmployees.map((row) => [row.name, row.department, row.position, row.status, row.salary]))}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                    >
                      <FileText className="h-4 w-4" /> Export PDF
                    </button>
                    <button onClick={exportEmployeesExcel} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600">
                      <FileSpreadsheet className="h-4 w-4" /> Export Excel
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Export filtered employee data for admin review and HR planning.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
