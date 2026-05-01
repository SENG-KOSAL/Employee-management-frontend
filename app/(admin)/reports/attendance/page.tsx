"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, FileSpreadsheet, FileText, Filter, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

type GenericRow = Record<string, unknown>;

type TabKey = "attendance" | "leave" | "summary" | "insights";
type RangeKey = "day" | "week" | "month";

type EmployeeLite = {
  id: number;
  name: string;
  department: string;
  status: string;
};

type AttendanceRow = {
  id: string;
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "present" | "late" | "absent";
  totalHours: number;
};

type LeaveRow = {
  id: string;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  department: string;
  startDate: string;
  endDate: string;
  status: "approved" | "pending" | "denied";
  reason: string;
};

const normalizeEmployeeStatus = (value: unknown): "active" | "inactive" => {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  if (typeof value === "number") return value > 0 ? "active" : "inactive";

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "active";

  if (["inactive", "disabled", "deactivated", "terminated", "resigned", "left", "suspended", "0", "false"].includes(raw)) {
    return "inactive";
  }

  if (["active", "enabled", "working", "confirmed", "1", "true"].includes(raw)) {
    return "active";
  }

  return "active";
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
      const next = from + diff * eased;
      setValue(Math.round(next * 100) / 100);
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

const getEmployeeId = (row: GenericRow): number => {
  if (typeof row.employee_id === "number") return row.employee_id;
  if (typeof row.employee_id === "string") return Number(row.employee_id) || 0;

  const employee = row.employee;
  if (employee && typeof employee === "object") {
    const id = (employee as GenericRow).id;
    if (typeof id === "number") return id;
    if (typeof id === "string") return Number(id) || 0;
  }

  if (typeof row.id === "number") return row.id;
  if (typeof row.id === "string") return Number(row.id) || 0;

  return 0;
};

const getName = (row: GenericRow): string => {
  if (typeof row.full_name === "string" && row.full_name.trim()) return row.full_name;
  if (typeof row.name === "string" && row.name.trim()) return row.name;
  const first = typeof row.first_name === "string" ? row.first_name : "";
  const last = typeof row.last_name === "string" ? row.last_name : "";
  const full = `${first} ${last}`.trim();
  return full || "Unknown";
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

const formatDate = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const formatTime = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const normalizeAttendanceStatus = (value: unknown): AttendanceRow["status"] => {
  const s = String(value || "").toLowerCase();
  if (s.includes("late")) return "late";
  if (s.includes("absent")) return "absent";
  return "present";
};

const normalizeLeaveStatus = (value: unknown): LeaveRow["status"] => {
  const s = String(value || "").toLowerCase();
  if (s.includes("approve")) return "approved";
  if (s.includes("deny") || s.includes("reject")) return "denied";
  return "pending";
};

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export default function AttendanceReportRoutePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("attendance");
  const [range, setRange] = useState<RangeKey>("day");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([]);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
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
    setEmployeeStatusFilter("all");
    setLeaveTypeFilter("all");
    setRange("month");
    applyDatePreset(29);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    applyDatePreset(29);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [employeesRes, attendanceRes, leaveRes] = await Promise.allSettled([
          api.get("/api/v1/employees?per_page=800"),
          api.get("/api/v1/attendances?per_page=2000"),
          api.get("/api/v1/leave-requests?per_page=2000"),
        ]);

        const employeePayload = employeesRes.status === "fulfilled" ? toArray(employeesRes.value.data) : [];
        const attendancePayload = attendanceRes.status === "fulfilled" ? toArray(attendanceRes.value.data) : [];
        const leavePayload = leaveRes.status === "fulfilled" ? toArray(leaveRes.value.data) : [];

        const mappedEmployees = employeePayload
          .map((row) => {
            const rawId = row.id;
            const directId = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) || 0 : 0;
            return {
              id: directId || getEmployeeId(row),
              name: getName(row),
              department: getDepartment(row),
              status: normalizeEmployeeStatus(row.status ?? row.employment_status ?? row.is_active ?? row.active),
            };
          })
          .filter((employee) => employee.id > 0);

        const employeeMap = new Map<number, EmployeeLite>(mappedEmployees.map((item) => [item.id, item]));

        const mappedAttendance: AttendanceRow[] = attendancePayload
          .map((row, index) => {
            const employee = row.employee && typeof row.employee === "object" ? (row.employee as GenericRow) : null;
            const employeeId = getEmployeeId(row);
            const employeeBase = employeeMap.get(employeeId);
            const date = formatDate(row.date ?? row.attendance_date ?? row.created_at);

            return {
              id: String(row.id ?? `${employeeId}-${date}-${index}`),
              employeeId,
              employeeName: getName(employee ?? employeeBase ?? row),
              department: getDepartment(employee ?? employeeBase ?? row),
              date,
              checkIn: formatTime(row.check_in ?? row.check_in_time ?? row.clock_in),
              checkOut: formatTime(row.check_out ?? row.check_out_time ?? row.clock_out),
              status: normalizeAttendanceStatus(row.status),
              totalHours: Number(toNumber(row.total_hours ?? row.hours_worked ?? row.worked_hours).toFixed(2)),
            };
          })
          .filter((row) => row.date)
          .sort((a, b) => b.date.localeCompare(a.date));

        const mappedLeaves: LeaveRow[] = leavePayload
          .map((row, index) => {
            const employee = row.employee && typeof row.employee === "object" ? (row.employee as GenericRow) : null;
            const employeeId = getEmployeeId(row);
            const employeeBase = employeeMap.get(employeeId);

            return {
              id: String(row.id ?? `${employeeId}-${index}`),
              employeeId,
              employeeName: getName(employee ?? employeeBase ?? row),
              leaveType: String(row.leave_type_name || row.leave_type || "General Leave"),
              department: getDepartment(employee ?? employeeBase ?? row),
              startDate: formatDate(row.start_date ?? row.from_date ?? row.created_at),
              endDate: formatDate(row.end_date ?? row.to_date ?? row.start_date ?? row.created_at),
              status: normalizeLeaveStatus(row.status),
              reason: String(row.reason || "-") || "-",
            };
          })
          .filter((row) => row.startDate)
          .sort((a, b) => b.startDate.localeCompare(a.startDate));

        setEmployees(mappedEmployees);
        setAttendanceRows(mappedAttendance);
        setLeaveRows(mappedLeaves);

        if (employeesRes.status === "rejected" || attendanceRes.status === "rejected" || leaveRes.status === "rejected") {
          setError("Some sources failed to load. Showing available report data.");
        }
      } catch {
        setError("Unable to load Attendance & Leave report module.");
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

  const leaveTypes = useMemo(
    () => Array.from(new Set(leaveRows.map((e) => e.leaveType))).sort((a, b) => a.localeCompare(b)),
    [leaveRows]
  );

  const inRange = (date: string) => {
    if (!date) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const filteredAttendance = useMemo(() => {
    const shouldRestrictByEmployee = employees.length > 0;
    const filteredEmployeeIds = new Set(
      employees
        .filter((employee) => {
          if (employeeFilter !== "all" && String(employee.id) !== employeeFilter) return false;
          if (departmentFilter !== "all" && employee.department !== departmentFilter) return false;
          if (employeeStatusFilter !== "all" && employee.status !== employeeStatusFilter) return false;
          return true;
        })
        .map((employee) => employee.id)
    );

    return attendanceRows.filter((row) => {
      if (shouldRestrictByEmployee && !filteredEmployeeIds.has(row.employeeId)) return false;

      if (!shouldRestrictByEmployee) {
        if (employeeFilter !== "all" && String(row.employeeId) !== employeeFilter) return false;
        if (departmentFilter !== "all" && row.department !== departmentFilter) return false;
      }

      if (!inRange(row.date)) return false;
      return true;
    });
  }, [attendanceRows, employeeFilter, departmentFilter, employeeStatusFilter, employees, fromDate, toDate]);

  const filteredLeave = useMemo(() => {
    const shouldRestrictByEmployee = employees.length > 0;
    const filteredEmployeeIds = new Set(
      employees
        .filter((employee) => {
          if (employeeFilter !== "all" && String(employee.id) !== employeeFilter) return false;
          if (departmentFilter !== "all" && employee.department !== departmentFilter) return false;
          if (employeeStatusFilter !== "all" && employee.status !== employeeStatusFilter) return false;
          return true;
        })
        .map((employee) => employee.id)
    );

    return leaveRows.filter((row) => {
      if (shouldRestrictByEmployee && !filteredEmployeeIds.has(row.employeeId)) return false;

      if (!shouldRestrictByEmployee) {
        if (employeeFilter !== "all" && String(row.employeeId) !== employeeFilter) return false;
        if (departmentFilter !== "all" && row.department !== departmentFilter) return false;
      }

      if (leaveTypeFilter !== "all" && row.leaveType !== leaveTypeFilter) return false;
      if (!inRange(row.startDate)) return false;
      return true;
    });
  }, [leaveRows, employeeFilter, leaveTypeFilter, departmentFilter, employeeStatusFilter, employees, fromDate, toDate]);

  const filteredEmployeesCount = useMemo(() => {
    return employees.filter((employee) => {
      if (employeeFilter !== "all" && String(employee.id) !== employeeFilter) return false;
      if (departmentFilter !== "all" && employee.department !== departmentFilter) return false;
      if (employeeStatusFilter !== "all" && employee.status !== employeeStatusFilter) return false;
      return true;
    }).length;
  }, [employees, employeeFilter, departmentFilter, employeeStatusFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = filteredAttendance.filter((r) => r.date === today);

  const presentToday = todayAttendance.filter((r) => r.status === "present").length;
  const absentToday = todayAttendance.filter((r) => r.status === "absent").length;
  const lateToday = todayAttendance.filter((r) => r.status === "late").length;

  const totalHoursWorked = Number(filteredAttendance.reduce((sum, row) => sum + row.totalHours, 0).toFixed(2));
  const totalPresentRange = filteredAttendance.filter((r) => r.status === "present").length;
  const totalAbsentRange = filteredAttendance.filter((r) => r.status === "absent").length;
  const totalLateRange = filteredAttendance.filter((r) => r.status === "late").length;
  const totalLeaves = filteredLeave.length;
  const remainingLeavesEstimate = Math.max(0, filteredEmployeesCount * 12 - totalLeaves);

  const monthlyAttendance = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rows = filteredAttendance.filter((r) => r.date.startsWith(monthPrefix));

    const present = rows.filter((r) => r.status === "present").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const late = rows.filter((r) => r.status === "late").length;
    const avgHours = rows.length > 0 ? rows.reduce((s, r) => s + r.totalHours, 0) / rows.length : 0;

    return {
      rows: rows.length,
      present,
      absent,
      late,
      totalHours: Number(rows.reduce((s, r) => s + r.totalHours, 0).toFixed(2)),
      avgHours: Number(avgHours.toFixed(2)),
    };
  }, [filteredAttendance]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { label: string; present: number; late: number; absent: number }>();
    filteredAttendance.forEach((row) => {
      const base = map.get(row.date) || { label: row.date.slice(5), present: 0, late: 0, absent: 0 };
      base[row.status] += 1;
      map.set(row.date, base);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([, value]) => value);
  }, [filteredAttendance]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { label: string; present: number; late: number; absent: number }>();
    filteredAttendance.forEach((row) => {
      const month = row.date.slice(0, 7);
      const base = map.get(month) || { label: month, present: 0, late: 0, absent: 0 };
      base[row.status] += 1;
      map.set(month, base);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([, value]) => value);
  }, [filteredAttendance]);

  const overtimeSummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredAttendance.forEach((row) => {
      const overtime = Math.max(0, row.totalHours - 8);
      map.set(row.employeeName, (map.get(row.employeeName) || 0) + overtime);
    });

    return Array.from(map.entries())
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 7);
  }, [filteredAttendance]);

  const topLateEmployees = useMemo(() => {
    const map = new Map<string, number>();
    filteredAttendance.forEach((row) => {
      if (row.status !== "late") return;
      map.set(row.employeeName, (map.get(row.employeeName) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, lateCount]) => ({ name, lateCount }))
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);
  }, [filteredAttendance]);

  const cardTotals = {
    totalEmployees: useCountUp(filteredEmployeesCount),
    presentToday: useCountUp(presentToday),
    absentToday: useCountUp(absentToday),
    lateToday: useCountUp(lateToday),
    totalHours: useCountUp(totalHoursWorked),
  };

  const exportAttendanceExcel = () => {
    const lines: string[] = [];
    lines.push(["Employee", "Date", "Check-in", "Check-out", "Status", "Total Hours"].map(csvCell).join(","));
    filteredAttendance.forEach((row) => {
      lines.push([row.employeeName, row.date, row.checkIn, row.checkOut, row.status, row.totalHours].map(csvCell).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportLeaveExcel = () => {
    const lines: string[] = [];
    lines.push(["Employee", "Leave Type", "Start Date", "End Date", "Status", "Reason"].map(csvCell).join(","));
    filteredLeave.forEach((row) => {
      lines.push([row.employeeName, row.leaveType, row.startDate, row.endDate, row.status, row.reason].map(csvCell).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
    const popup = window.open("", "_blank");
    if (!popup) return;

    const headersHtml = headers.map((h) => `<th>${h}</th>`).join("");
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
            th { background: #3B82F6; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${headersHtml}</tr></thead>
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
            <span className="font-semibold text-slate-700">📊 Report (Attendance &amp; Leave)</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Attendance &amp; Leave → Report Module</h1>
              <p className="text-sm text-slate-600">Daily and monthly admin reporting with cards, filters, tables, charts, and exports.</p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { id: "attendance", label: "Attendance Report" },
                { id: "leave", label: "Leave Report" },
                { id: "summary", label: "Summary Report" },
                { id: "insights", label: "Insights / Overtime" },
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
                <span className="text-xs font-medium text-slate-600">Employee</span>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
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
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Employee status</span>
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </label>

              {activeTab === "leave" ? (
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Leave Type</span>
                  <select
                    value={leaveTypeFilter}
                    onChange={(e) => setLeaveTypeFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="all">All Leave Types</option>
                    {leaveTypes.map((leaveType) => (
                      <option key={leaveType} value={leaveType}>
                        {leaveType}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500">
                  Tip: Switch to <strong>Leave Report</strong> tab to filter by leave type.
                </div>
              )}

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Quick range</span>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                  { id: "month", label: "Month" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRangeChange(r.id as RangeKey)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      range === r.id ? "bg-blue-500 text-white" : "text-slate-600"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setRange("day");
                      applyDatePreset(0);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setRange("week");
                      applyDatePreset(6);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => {
                      setRange("month");
                      applyDatePreset(29);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Last 30 days
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Employees in scope: {filteredEmployeesCount}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">Present (range): {totalPresentRange}</span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700">Late (range): {totalLateRange}</span>
              <span className="rounded-full bg-red-200 px-2.5 py-1 font-semibold text-red-800">Absent (range): {totalAbsentRange}</span>
            </div>
          </div>

          {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading report module...</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {activeTab === "summary" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Summary Report ({range === "day" ? "Daily" : range === "week" ? "Weekly" : "Monthly"})</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  <CalendarDays className="h-3.5 w-3.5" /> Quick scan mode
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { title: "Total Employees", value: cardTotals.totalEmployees },
                  { title: "Present Today", value: cardTotals.presentToday },
                  { title: "Absent Today", value: cardTotals.absentToday },
                  { title: "Late Today", value: cardTotals.lateToday },
                  { title: "Total Hours Worked", value: cardTotals.totalHours },
                ].map((card, index) => (
                  <div
                    key={card.title}
                    className={`rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-400 p-4 text-white shadow-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${
                      ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    }`}
                    style={{ transitionDelay: `${index * 90}ms` }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-100">{card.title}</div>
                    <div className="mt-2 text-3xl font-bold">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Monthly Totals &amp; Averages</h3>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">Monthly Attendance Rows: <strong>{monthlyAttendance.rows}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3">Present: <strong>{monthlyAttendance.present}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3">Absent: <strong>{monthlyAttendance.absent}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3">Late: <strong>{monthlyAttendance.late}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3">Total Hours: <strong>{monthlyAttendance.totalHours}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3">Avg Hours/Row: <strong>{monthlyAttendance.avgHours}</strong></div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "attendance" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Present (Range)", value: totalPresentRange, color: "bg-emerald-500" },
                  { title: "Late (Range)", value: totalLateRange, color: "bg-red-400" },
                  { title: "Absent (Range)", value: totalAbsentRange, color: "bg-red-700" },
                  { title: "Employees in Scope", value: filteredEmployeesCount, color: "bg-blue-500" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.title}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Attendance Report</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportPdf(
                        "Attendance Report",
                        ["Employee", "Date", "Check-in", "Check-out", "Status", "Total Hours"],
                        filteredAttendance.map((r) => [r.employeeName, r.date, r.checkIn, r.checkOut, r.status, r.totalHours])
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
                    <FileText className="h-4 w-4" /> PDF
                  </button>
                  <button
                    onClick={exportAttendanceExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
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
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Check-in</th>
                        <th className="px-4 py-3 text-left font-semibold">Check-out</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            No attendance records in selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.slice(0, 250).map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${
                              ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                            }`}
                            style={{ transitionDelay: `${Math.min(idx * 18, 280)}ms` }}
                          >
                            <td className="px-4 py-3">
                              <Link href={`/employees/${row.employeeId}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">
                                {row.employeeName}
                              </Link>
                              <div className="text-xs text-slate-500">{row.department}</div>
                            </td>
                            <td className="px-4 py-3">{row.date}</td>
                            <td className="px-4 py-3">{row.checkIn}</td>
                            <td className="px-4 py-3">{row.checkOut}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                                  row.status === "present"
                                    ? "bg-emerald-500"
                                    : row.status === "late"
                                      ? "bg-red-400"
                                      : "bg-red-700"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{row.totalHours.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "leave" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${
                    ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 -rotate-1 opacity-0"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase text-slate-500">Total Leaves</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{totalLeaves}</div>
                </div>
                <div
                  className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${
                    ready ? "translate-y-0 rotate-0 opacity-100" : "translate-y-3 rotate-1 opacity-0"
                  }`}
                  style={{ transitionDelay: "80ms" }}
                >
                  <div className="text-xs font-semibold uppercase text-slate-500">Remaining Leaves (Est.)</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{remainingLeavesEstimate}</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Leave Report</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportPdf(
                        "Leave Report",
                        ["Employee", "Leave Type", "Start Date", "End Date", "Status", "Reason"],
                        filteredLeave.map((r) => [r.employeeName, r.leaveType, r.startDate, r.endDate, r.status, r.reason])
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
                    <FileText className="h-4 w-4" /> PDF
                  </button>
                  <button
                    onClick={exportLeaveExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
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
                        <th className="px-4 py-3 text-left font-semibold">Leave Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Start/End Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeave.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            No leave records in selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredLeave.slice(0, 250).map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`transition-all duration-500 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 ${
                              ready ? "opacity-100" : "opacity-0"
                            }`}
                            style={{ transitionDelay: `${Math.min(idx * 16, 280)}ms` }}
                          >
                            <td className="px-4 py-3">
                              <Link href={`/employees/${row.employeeId}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">
                                {row.employeeName}
                              </Link>
                            </td>
                            <td className="px-4 py-3">{row.leaveType}</td>
                            <td className="px-4 py-3">{row.startDate} → {row.endDate}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                                  row.status === "approved"
                                    ? "bg-emerald-500"
                                    : row.status === "pending"
                                        ? "bg-blue-400 text-blue-900"
                                      : "bg-red-500"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="max-w-xs truncate px-4 py-3" title={row.reason}>
                              {row.reason}
                            </td>
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
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Attendance Trends (Daily)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyTrend}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#64748B" />
                        <YAxis stroke="#64748B" allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="present" stroke="#3B82F6" strokeWidth={3} animationDuration={900} />
                        <Line type="monotone" dataKey="late" stroke="#EF4444" strokeWidth={2} animationDuration={1000} />
                        <Line type="monotone" dataKey="absent" stroke="#3B82F6" strokeWidth={2} animationDuration={1100} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Daily vs Monthly Comparison</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrend}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#64748B" />
                        <YAxis stroke="#64748B" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="present" fill="#3B82F6" radius={[8, 8, 0, 0]} animationDuration={900} />
                        <Bar dataKey="late" fill="#EF4444" radius={[8, 8, 0, 0]} animationDuration={1000} />
                        <Bar dataKey="absent" fill="#3B82F6" radius={[8, 8, 0, 0]} animationDuration={1100} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <Sparkles className="h-4 w-4" /> Top 5 Late Employees
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topLateEmployees.length === 0 ? (
                      <span className="text-sm text-slate-500">No late employees for current filter.</span>
                    ) : (
                      topLateEmployees.map((item, idx) => (
                        <span
                          key={item.name}
                          className={`rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-all duration-500 ${
                            ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                          }`}
                          style={{ transitionDelay: `${idx * 80}ms` }}
                        >
                          {item.name} • {item.lateCount}x
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Overtime Summary</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overtimeSummary} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis type="number" stroke="#64748B" />
                        <YAxis dataKey="name" type="category" stroke="#64748B" width={120} />
                        <Tooltip />
                        <Bar dataKey="hours" fill="#3B82F6" radius={[0, 8, 8, 0]} animationDuration={950} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
