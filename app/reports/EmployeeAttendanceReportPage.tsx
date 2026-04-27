"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
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
import { getToken } from "@/utils/auth";

type GenericRecord = Record<string, unknown>;

type EmployeeRow = {
  id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string | { name?: string };
  position?: string;
  status?: string;
};

type DepartmentRow = {
  id: number;
  name: string;
};

type AttendanceSummary = {
  total_hours: number;
  overtime_hours: number;
  trend: Array<{ label: string; total_hours: number; overtime_hours: number }>;
};

type EmployeeDetail = {
  id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department?: string | { name?: string };
  position?: string;
  status?: string;
};

type ReportFilters = {
  from: string;
  to: string;
  department: string;
  position: string;
  status: "" | "active" | "inactive";
  search: string;
};

type ToastMessage = {
  id: number;
  text: string;
  type: "error" | "success" | "warn";
};

const emptySummary: AttendanceSummary = {
  total_hours: 0,
  overtime_hours: 0,
  trend: [],
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const root = payload as GenericRecord;
  const firstData = root.data;
  if (Array.isArray(firstData)) return firstData as T[];

  if (firstData && typeof firstData === "object") {
    const secondData = (firstData as GenericRecord).data;
    if (Array.isArray(secondData)) return secondData as T[];
  }

  return [];
};

const extractObject = <T,>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as GenericRecord;
  const firstData = root.data;

  if (firstData && !Array.isArray(firstData) && typeof firstData === "object") {
    const secondData = (firstData as GenericRecord).data;
    if (secondData && !Array.isArray(secondData) && typeof secondData === "object") {
      return secondData as T;
    }
    return firstData as T;
  }

  return payload as T;
};

const getDepartmentName = (value: EmployeeRow["department"] | EmployeeDetail["department"]) => {
  if (!value) return "Unassigned";
  return typeof value === "string" ? value : value.name || "Unassigned";
};

const getEmployeeName = (employee: Partial<EmployeeRow> | Partial<EmployeeDetail>) => {
  return employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Employee";
};

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const status = (err as any)?.response?.status;
  const message = (err as any)?.response?.data?.message || (err as any)?.message;

  if (status === 401 || status === 403) {
    return "Unauthorized request. Please login again or verify permissions.";
  }

  if (typeof message === "string" && message.trim()) return message;
  return fallback;
};

const getAttendanceSummary = (payload: unknown): AttendanceSummary => {
  const base = extractObject<GenericRecord>(payload);
  if (!base) {
    const list = extractArray<GenericRecord>(payload);
    if (list.length === 0) return emptySummary;
    const first = list[0];
    return {
      total_hours: toNumber(first.total_hours),
      overtime_hours: toNumber(first.overtime_hours),
      trend: [],
    };
  }

  const trendRaw = Array.isArray(base.trend)
    ? (base.trend as GenericRecord[])
    : Array.isArray(base.history)
      ? (base.history as GenericRecord[])
      : [];

  const trend = trendRaw.map((row, idx) => ({
    label: String(row.label || row.date || row.period || `P${idx + 1}`),
    total_hours: toNumber(row.total_hours || row.hours || row.total),
    overtime_hours: toNumber(row.overtime_hours || row.overtime || row.ot),
  }));

  return {
    total_hours: toNumber(base.total_hours || base.hours || base.total),
    overtime_hours: toNumber(base.overtime_hours || base.overtime || base.total_overtime),
    trend,
  };
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function EmployeeAttendanceReportPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceSummary>>({});
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartReady, setChartReady] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<ReportFilters>({ from: "", to: "", department: "", position: "", status: "", search: "" });
  const [draftFilters, setDraftFilters] = useState<ReportFilters>({ from: "", to: "", department: "", position: "", status: "", search: "" });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [toastSeed, setToastSeed] = useState(0);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [employeeDetail, setEmployeeDetail] = useState<EmployeeDetail | null>(null);
  const [detailSummary, setDetailSummary] = useState<AttendanceSummary>(emptySummary);
  const [benefits, setBenefits] = useState<GenericRecord[]>([]);
  const [deductions, setDeductions] = useState<GenericRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<GenericRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<"monthly" | "weekly">("monthly");

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const notify = (text: string, type: ToastMessage["type"]) => {
    setToastSeed((prev) => {
      const next = prev + 1;
      setToasts((current) => [...current, { id: next, text, type }]);
      return next;
    });
  };

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const loadInitial = async () => {
      try {
        setLoading(true);
        const deptRes = await api.get("/api/v1/departments");
        setDepartments(extractArray<DepartmentRow>(deptRes.data));
      } catch (err) {
        const msg = getErrorMessage(err, "Failed to load departments");
        setError(msg);
        notify(msg, "error");
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [router]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 3500)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts]);

  const fetchEmployees = async () => {
    try {
      setTableLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_by: "first_name",
        sort_dir: "asc",
      });

      if (filters.search.trim()) params.append("search", filters.search.trim());
      if (filters.department) params.append("department", filters.department);
      if (filters.position) params.append("position", filters.position);
      if (filters.status) params.append("status", filters.status);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);

      const res = await api.get(`/api/v1/employees?${params.toString()}`);
      const root = res.data?.data ?? res.data;
      const rows = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
      setEmployees(rows);
      setTotal(Number(root?.total || root?.meta?.total || rows.length || 0));

      const summaryEntries = await Promise.all(
        rows.map(async (row: EmployeeRow) => {
          try {
            const summaryParams = new URLSearchParams({ employee_id: String(row.id), type: "monthly" });
            if (filters.from) summaryParams.append("from", filters.from);
            if (filters.to) summaryParams.append("to", filters.to);
            const summaryRes = await api.get(`/api/v1/attendances/summary?${summaryParams.toString()}`);
            return [row.id, getAttendanceSummary(summaryRes.data)] as const;
          } catch {
            return [row.id, emptySummary] as const;
          }
        })
      );

      setAttendanceMap(Object.fromEntries(summaryEntries) as Record<number, AttendanceSummary>);
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load employee report data");
      setError(msg);
      notify(msg, "error");
      setEmployees([]);
      setAttendanceMap({});
      setTotal(0);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    void fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, filters]);

  const positions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((employee) => {
      if (employee.position) set.add(employee.position);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const overtimeByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((row) => {
      const dept = getDepartmentName(row.department);
      const overtime = attendanceMap[row.id]?.overtime_hours || 0;
      map.set(dept, (map.get(dept) || 0) + overtime);
    });

    return Array.from(map.entries())
      .map(([department, overtime]) => ({ department, overtime: Number(overtime.toFixed(2)) }))
      .sort((a, b) => b.overtime - a.overtime)
      .slice(0, 7);
  }, [employees, attendanceMap]);

  const tableStats = useMemo(() => {
    const active = employees.filter((row) => String(row.status || "").toLowerCase() === "active").length;
    const inactive = employees.filter((row) => String(row.status || "").toLowerCase() === "inactive").length;
    const totalHours = employees.reduce((acc, row) => acc + (attendanceMap[row.id]?.total_hours || 0), 0);
    const overtime = employees.reduce((acc, row) => acc + (attendanceMap[row.id]?.overtime_hours || 0), 0);

    return {
      active,
      inactive,
      totalHours: Number(totalHours.toFixed(2)),
      overtime: Number(overtime.toFixed(2)),
    };
  }, [employees, attendanceMap]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((row) => row.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const openDetailModal = async (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    setDetailLoading(true);
    setAuditTrail([]);

    try {
      const summaryParams = new URLSearchParams({ employee_id: String(employeeId), type: "monthly" });
      if (filters.from) summaryParams.append("from", filters.from);
      if (filters.to) summaryParams.append("to", filters.to);

      const [employeeRes, summaryRes, benefitsRes, deductionsRes] = await Promise.all([
        api.get(`/api/v1/employees/${employeeId}`),
        api.get(`/api/v1/attendances/summary?${summaryParams.toString()}`),
        api.get(`/api/v1/employee-benefits?employee_id=${employeeId}`),
        api.get(`/api/v1/employee-deductions?employee_id=${employeeId}`),
      ]);

      setEmployeeDetail(extractObject<EmployeeDetail>(employeeRes.data));
      setDetailSummary(getAttendanceSummary(summaryRes.data));
      setBenefits(extractArray<GenericRecord>(benefitsRes.data));
      setDeductions(extractArray<GenericRecord>(deductionsRes.data));
    } catch (err) {
      notify(getErrorMessage(err, "Failed to load employee drill-down"), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedEmployeeId(null);
    setEmployeeDetail(null);
    setDetailSummary(emptySummary);
    setBenefits([]);
    setDeductions([]);
    setAuditTrail([]);
    setAuditLoading(false);
  };

  const loadAuditTrail = async () => {
    if (!selectedEmployeeId) return;
    try {
      setAuditLoading(true);
      const res = await api.get(`/api/v1/employees/${selectedEmployeeId}/audit-trail?per_page=20`);
      setAuditTrail(extractArray<GenericRecord>(res.data));
      notify("Audit trail loaded", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Failed to load audit trail"), "error");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setFilters(draftFilters);
  };

  const handleResetFilters = () => {
    const next: ReportFilters = { from: "", to: "", department: "", position: "", status: "", search: "" };
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append("search", filters.search.trim());
      if (filters.department) params.append("department", filters.department);
      if (filters.position) params.append("position", filters.position);
      if (filters.status) params.append("status", filters.status);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);

      const res = await api.get(`/api/v1/admin/employees/export?${params.toString()}`, { responseType: "blob" });
      triggerDownload(new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `employee-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify("Excel export completed", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Excel export failed"), "error");
    }
  };

  const exportPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.department) params.append("department", filters.department);

      const response = await api.get(`/api/v1/payslips?${params.toString()}`, { responseType: "blob" });
      const mime = response.headers?.["content-type"] || "application/pdf";

      if (String(mime).includes("pdf")) {
        triggerDownload(new Blob([response.data], { type: "application/pdf" }), `employee-report-${Date.now()}.pdf`);
        notify("PDF export completed", "success");
        return;
      }

      throw new Error("No PDF stream");
    } catch {
      const printWin = window.open("", "_blank");
      if (!printWin) {
        notify("Popup blocked. Allow popups to print PDF summary.", "warn");
        return;
      }

      const htmlRows = employees.map((row) => {
        const summary = attendanceMap[row.id] || emptySummary;
        return `<tr><td>${row.employee_code || "-"}</td><td>${getEmployeeName(row)}</td><td>${getDepartmentName(row.department)}</td><td>${row.position || "-"}</td><td>${summary.total_hours.toFixed(2)}</td><td>${summary.overtime_hours.toFixed(2)}</td><td>${row.status || "-"}</td></tr>`;
      }).join("");

      printWin.document.write(`<html><head><title>Employee Attendance Report</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f6f8fa}</style></head><body><h1>Employee & Attendance Report</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Employee Code</th><th>Name</th><th>Department</th><th>Position</th><th>Total Hours</th><th>Overtime</th><th>Status</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      notify("Printable summary opened", "success");
    }
  };

  const scheduleMonthlyReport = () => {
    if (!scheduleEmail.trim()) {
      notify("Email is required for scheduling", "warn");
      return;
    }
    setShowScheduleModal(false);
    notify(`Scheduled ${scheduleFrequency} report for ${scheduleEmail}`, "success");
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer", "manager"]}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">
                <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Home</Link>
                <span className="mx-2">→</span>
                <span>Reports</span>
                <span className="mx-2">→</span>
                <span className="text-slate-700 font-semibold">Monthly / Employee</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Employee & Attendance Report</h1>
              <p className="text-sm text-slate-500 mt-1">Monitor attendance, overtime, and employee status with drill-down insights.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"><Download className="w-4 h-4" /> Excel</button>
              <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-100"><FileText className="w-4 h-4" /> PDF</button>
              <button onClick={() => setShowScheduleModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-100"><BellRing className="w-4 h-4" /> Schedule</button>
              <button onClick={fetchEmployees} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${tableLoading ? "animate-spin" : ""}`} /> Refresh</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><p className="text-xs uppercase font-semibold text-blue-600">Employees (Page)</p><p className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-xs uppercase font-semibold text-emerald-700">Total Hours</p><p className="text-2xl font-bold text-slate-900 mt-1">{tableStats.totalHours.toFixed(1)}</p></div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><p className="text-xs uppercase font-semibold text-amber-700">Overtime</p><p className="text-2xl font-bold text-slate-900 mt-1">{tableStats.overtime.toFixed(1)}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase font-semibold text-slate-500">Active / Inactive</p><p className="text-2xl font-bold text-slate-900 mt-1">{tableStats.active} / {tableStats.inactive}</p></div>
          </div>

          <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <label className="text-xs font-semibold uppercase text-slate-500">From<input type="date" value={draftFilters.from} onChange={(e) => setDraftFilters((prev) => ({ ...prev, from: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-semibold uppercase text-slate-500">To<input type="date" value={draftFilters.to} onChange={(e) => setDraftFilters((prev) => ({ ...prev, to: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Department<select value={draftFilters.department} onChange={(e) => setDraftFilters((prev) => ({ ...prev, department: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"><option value="">All</option>{departments.map((dept) => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}</select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Position<select value={draftFilters.position} onChange={(e) => setDraftFilters((prev) => ({ ...prev, position: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"><option value="">All</option>{positions.map((position) => (<option key={position} value={position}>{position}</option>))}</select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Status<select value={draftFilters.status} onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value as ReportFilters["status"] }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Employee Search<div className="mt-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={draftFilters.search} onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Name or code" className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900" /></div></label>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button onClick={handleResetFilters} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50">Reset Filters</button>
              <button onClick={handleApplyFilters} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-700"><Filter className="w-4 h-4" /> Apply Filters</button>
            </div>
          </div>

          {error && (<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {error}</div>)}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-600" /> Overtime by Department</h3>
              <div className="h-64">{!chartReady ? <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" /> : overtimeByDepartment.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-slate-500">No chart data in selected scope.</div> : <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={overtimeByDepartment}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="department" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="overtime" fill="#f59e0b" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={450} /></BarChart></ResponsiveContainer>}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" /> Selected Employee Attendance Trend</h3>
              <div className="h-64">{!chartReady ? <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" /> : selectedEmployeeId && attendanceMap[selectedEmployeeId]?.trend?.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={attendanceMap[selectedEmployeeId].trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="total_hours" stroke="#4f46e5" strokeWidth={2} dot={false} isAnimationActive animationDuration={500} /><Line type="monotone" dataKey="overtime_hours" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive animationDuration={500} /></LineChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-slate-500">Select an employee row to view attendance trend.</div>}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Employee Attendance Table</p><p className="text-xs text-slate-500">Total: {total}</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Attendance Total Hours</th><th className="px-4 py-3">Overtime Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {tableLoading ? Array.from({ length: 7 }).map((_, idx) => (<tr key={idx}><td colSpan={8} className="px-4 py-3"><div className="h-9 w-full rounded-lg bg-slate-100 animate-pulse" /></td></tr>)) : employees.length === 0 ? (<tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No employees found for current filters.</td></tr>) : employees.map((row, idx) => {
                    const summary = attendanceMap[row.id] || emptySummary;
                    const isInactive = String(row.status || "").toLowerCase() === "inactive";
                    return (
                      <tr key={row.id} className="report-row cursor-pointer transition-all duration-200 hover:bg-indigo-50/40" style={{ animationDelay: `${idx * 40}ms` }} onClick={() => void openDetailModal(row.id)}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.employee_code || "-"}</td>
                        <td className="px-4 py-3">{getEmployeeName(row)}</td>
                        <td className="px-4 py-3">{getDepartmentName(row.department)}</td>
                        <td className="px-4 py-3">{row.position || "-"}</td>
                        <td className="px-4 py-3">{summary.total_hours.toFixed(2)}</td>
                        <td className="px-4 py-3">{summary.overtime_hours.toFixed(2)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${isInactive ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{row.status || "active"}</span></td>
                        <td className="px-4 py-3 text-right"><button onClick={(event) => { event.stopPropagation(); void openDetailModal(row.id); }} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50">View Details</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next <ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed top-20 right-6 z-[70] space-y-2">{toasts.map((toast) => (<div key={toast.id} className={`toast-slide rounded-lg border px-3 py-2 text-sm shadow-md ${toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : toast.type === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /><span>{toast.text}</span></div></div>))}</div>

        <div className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${selectedEmployeeId ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={closeDetailModal} />
        <aside className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${selectedEmployeeId ? "translate-x-0" : "translate-x-full"}`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
            <div><p className="text-xs uppercase font-semibold text-indigo-600">Employee Drill-down</p><h3 className="text-lg font-bold text-slate-900">{employeeDetail ? getEmployeeName(employeeDetail) : selectedEmployee ? getEmployeeName(selectedEmployee) : "Details"}</h3><p className="text-xs text-slate-500">Attendance summary, benefits, deductions, and audit trail.</p></div>
            <button onClick={closeDetailModal} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="h-[calc(100%-74px)] overflow-y-auto p-5 space-y-4">
            {detailLoading ? <div className="h-32 rounded-xl bg-slate-100 animate-pulse" /> : (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs uppercase text-slate-500 font-semibold">Employee Code</p><p className="text-sm font-bold text-slate-900 mt-1">{employeeDetail?.employee_code || selectedEmployee?.employee_code || "-"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs uppercase text-slate-500 font-semibold">Department</p><p className="text-sm font-bold text-slate-900 mt-1">{getDepartmentName(employeeDetail?.department || selectedEmployee?.department)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs uppercase text-slate-500 font-semibold">Attendance Total</p><p className="text-sm font-bold text-slate-900 mt-1">{detailSummary.total_hours.toFixed(2)} h</p></div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs uppercase text-slate-500 font-semibold">Overtime</p><p className="text-sm font-bold text-slate-900 mt-1">{detailSummary.overtime_hours.toFixed(2)} h</p></div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-slate-800">Benefits & Deductions</h4><button onClick={loadAuditTrail} disabled={auditLoading} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">{auditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Audit Trail</button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs uppercase font-semibold text-emerald-700">Benefits ({benefits.length})</p><ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">{benefits.length === 0 ? <li className="text-xs text-emerald-800/80">No benefits found.</li> : benefits.map((row, idx) => (<li key={idx} className="text-xs text-emerald-900">{String(row.name || row.type || "Benefit")} - {toNumber(row.amount).toFixed(2)}</li>))}</ul></div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3"><p className="text-xs uppercase font-semibold text-rose-700">Deductions ({deductions.length})</p><ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">{deductions.length === 0 ? <li className="text-xs text-rose-800/80">No deductions found.</li> : deductions.map((row, idx) => (<li key={idx} className="text-xs text-rose-900">{String(row.name || row.type || "Deduction")} - {toNumber(row.amount).toFixed(2)}</li>))}</ul></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4"><h4 className="text-sm font-semibold text-slate-800 mb-2">Attendance Over Time</h4><div className="h-56">{!chartReady ? <div className="h-full w-full rounded-lg bg-slate-100 animate-pulse" /> : detailSummary.trend.length > 0 ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={detailSummary.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="total_hours" stroke="#4f46e5" strokeWidth={2} dot={false} isAnimationActive animationDuration={500} /></LineChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-slate-500">No attendance trend data.</div>}</div></div>

              {auditTrail.length > 0 && (<div className="rounded-xl border border-slate-200 p-4"><h4 className="text-sm font-semibold text-slate-800 mb-2">Audit Trail (latest 20)</h4><div className="space-y-2 max-h-48 overflow-y-auto">{auditTrail.map((row, idx) => (<div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700"><p className="font-medium">{String(row.action || row.event || "Updated")}</p><p className="text-slate-500 mt-1">{String(row.created_at || row.timestamp || "-")}</p></div>))}</div></div>)}
            </>)}
          </div>
        </aside>

        <div className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${showScheduleModal ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setShowScheduleModal(false)} />
        <div className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${showScheduleModal ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs uppercase font-semibold text-emerald-600">Scheduled Notification</p><h3 className="text-lg font-bold text-slate-900">Schedule Report</h3></div><button onClick={() => setShowScheduleModal(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4">
            <label className="block"><span className="block text-xs uppercase font-semibold text-slate-500 mb-1">Email</span><input value={scheduleEmail} onChange={(e) => setScheduleEmail(e.target.value)} placeholder="reports@company.com" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" /></label>
            <label className="block"><span className="block text-xs uppercase font-semibold text-slate-500 mb-1">Frequency</span><select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value as "monthly" | "weekly")} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label>
            <div className="pt-2 flex items-center justify-end gap-2"><button onClick={() => setShowScheduleModal(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={scheduleMonthlyReport} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save Schedule</button></div>
          </div>
        </div>

        <style jsx>{`
          .report-row { opacity: 0; transform: translateY(8px); animation: rowFade 380ms ease-out forwards; }
          .toast-slide { animation: toastIn 260ms ease-out forwards; }
          @keyframes rowFade { to { opacity: 1; transform: translateY(0); } }
          @keyframes toastIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        `}</style>
      </RoleGate>
    </HRMSSidebar>
  );
}
