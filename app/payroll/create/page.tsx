"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { departmentsService } from "@/services/departments";
import type { Department } from "@/types/hr";
import { getToken } from "@/utils/auth";

type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  department?: string | { name?: string | null } | null;
  position?: string | { title?: string | null; name?: string | null } | null;
  status?: string | null;
  employee_code?: string | null;
};

type PayrollCreatePayload = {
  month: number;
  year: number;
  period_start: string;
  period_end: string;
  employee_ids: number[];
  notes?: string;
};

const defaultStatusOptions = ["active", "inactive", "on leave", "terminated", "resigned", "contractor", "probation"];

const getEmployeeName = (employee: Employee) =>
  `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unnamed Employee";

const getDepartmentName = (employee: Employee) => {
  if (typeof employee.department === "string") return employee.department;
  return employee.department?.name?.trim() || "Unassigned";
};

const getPositionName = (employee: Employee) => {
  if (typeof employee.position === "string") return employee.position;
  return employee.position?.title?.trim() || employee.position?.name?.trim() || "—";
};

const normalizeStatus = (status?: string | null) => {
  const value = status?.trim();
  return value ? value : "Unknown";
};

const formatStatusLabel = (status: string) =>
  status
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const getMonthRange = (value: string) => {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0));

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  return {
    year,
    month: monthIndex + 1,
    periodStart: formatDate(startDate),
    periodEnd: formatDate(endDate),
  };
};

const getMonthLabel = (value: string) => {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string" &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default function PayrollCreatePage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeesError, setEmployeesError] = useState("");
  const [success, setSuccess] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    void fetchEmployees();
    void fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentsService.list();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError("");
      const params = new URLSearchParams({ per_page: "500" });
      const res = await api.get(`/api/v1/employees?${params.toString()}`);
      const payload = res.data?.data ?? res.data;
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      const normalizedRows = [...rows].sort((a: Employee, b: Employee) =>
        getEmployeeName(a).localeCompare(getEmployeeName(b))
      );

      setEmployees(normalizedRows);
      setSelectedEmployeeIds(normalizedRows.map((employee: Employee) => employee.id));
    } catch (err: unknown) {
      setEmployeesError(getApiErrorMessage(err, "Failed to load employees for payroll generation."));
      console.error("Failed to fetch payroll employees", err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !term ||
        getEmployeeName(employee).toLowerCase().includes(term) ||
        (employee.employee_code || "").toLowerCase().includes(term);
      const matchesDepartment = !departmentFilter || getDepartmentName(employee) === departmentFilter;
      const matchesStatus = !statusFilter || normalizeStatus(employee.status).toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, employees, search, statusFilter]);

  const selectedEmployeeIdSet = useMemo(() => new Set(selectedEmployeeIds), [selectedEmployeeIds]);

  const includedCount = selectedEmployeeIds.length;
  const excludedCount = Math.max(0, employees.length - includedCount);
  const allVisibleSelected = visibleEmployees.length > 0 && visibleEmployees.every((employee) => selectedEmployeeIdSet.has(employee.id));

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const selectAllVisible = () => {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);
      visibleEmployees.forEach((employee) => next.add(employee.id));
      return Array.from(next);
    });
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(visibleEmployees.map((employee) => employee.id));
    setSelectedEmployeeIds((current) => current.filter((id) => !visibleIds.has(id)));
  };

  const handleGeneratePayroll = async () => {
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setError("Select at least one employee before generating payroll.");
      setShowConfirmDialog(false);
      return;
    }
    try {
      setLoading(true);
      const { year, month: monthNumber, periodStart, periodEnd } = getMonthRange(month);
      const payload: PayrollCreatePayload = {
        month: monthNumber,
        year,
        period_start: periodStart,
        period_end: periodEnd,
        employee_ids: [...selectedEmployeeIds].sort((left, right) => left - right),
      };
      if (notes.trim()) payload.notes = notes.trim();
      const res = await api.post("/api/v1/payroll-runs", payload);
      const created = res.data?.data ?? res.data;
      setSuccess("Payroll run generated successfully.");
      setShowConfirmDialog(false);
      setTimeout(() => setSuccess(""), 3000);
      // If backend returns id, go to payroll page; otherwise just navigate back.
      if (created?.id) {
        router.push(`/payroll/${created.id}`);
      } else {
        router.push("/payroll");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create payroll run"));
      console.error("Create payroll error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedEmployeeIds.length === 0) {
      setError("Select at least one employee before generating payroll.");
      return;
    }

    setShowConfirmDialog(true);
  };

  const departmentOptions = useMemo(() => {
    const employeeDepartments = employees
      .map((employee) => getDepartmentName(employee))
      .filter(Boolean);
    const knownDepartments = departments.map((department) => department.name).filter(Boolean);

    return Array.from(new Set([...knownDepartments, ...employeeDepartments])).sort((a, b) => a.localeCompare(b));
  }, [departments, employees]);

  const statusOptions = useMemo(() => {
    const employeeStatuses = employees.map((employee) => normalizeStatus(employee.status).toLowerCase());
    return Array.from(new Set([...defaultStatusOptions, ...employeeStatuses])).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Generate Payroll</h1>
            <p className="text-sm text-gray-500">Create a payroll run for a specific month and choose exactly which employees should be included.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Month</label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payroll Period</label>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-gray-50">
                      {getMonthRange(month).periodStart} to {getMonthRange(month).periodEnd}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Note (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any extra info for this payroll run"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Employee Selection</h2>
                      <p className="text-sm text-gray-500">All employees are selected by default. Uncheck any employees you want to exclude from this payroll run.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 self-start md:self-auto">
                      <Users className="h-3.5 w-3.5" />
                      {visibleEmployees.length} visible employee{visibleEmployees.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search employee name or code"
                        className="w-full bg-transparent text-sm text-black outline-none"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Clear employee search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All departments</option>
                      {departmentOptions.map((departmentName) => (
                        <option key={departmentName} value={departmentName}>
                          {departmentName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All employment statuses</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      disabled={employeesLoading || visibleEmployees.length === 0 || allVisibleSelected}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllVisible}
                      disabled={employeesLoading || visibleEmployees.length === 0}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deselect All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setDepartmentFilter("");
                        setStatusFilter("");
                      }}
                      disabled={!search && !departmentFilter && !statusFilter}
                      className="px-3 py-2 rounded-lg border border-transparent text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {employeesError && (
                  <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start justify-between gap-4">
                      <span>{employeesError}</span>
                      <button
                        type="button"
                        onClick={() => void fetchEmployees()}
                        className="text-sm font-medium text-red-700 underline underline-offset-2"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Select</th>
                          <th className="px-4 py-3 font-semibold">Employee</th>
                          <th className="px-4 py-3 font-semibold">Code</th>
                          <th className="px-4 py-3 font-semibold">Department</th>
                          <th className="px-4 py-3 font-semibold">Position</th>
                          <th className="px-4 py-3 font-semibold">Employment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {employeesLoading ? (
                          Array.from({ length: 6 }).map((_, index) => (
                            <tr key={index} className="animate-pulse">
                              <td className="px-4 py-4"><div className="h-4 w-4 rounded bg-gray-200" /></td>
                              <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                              <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                              <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                              <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                              <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                            </tr>
                          ))
                        ) : visibleEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                              No employees match the current filters.
                            </td>
                          </tr>
                        ) : (
                          visibleEmployees.map((employee) => {
                            const isSelected = selectedEmployeeIdSet.has(employee.id);

                            return (
                              <tr
                                key={employee.id}
                                className={isSelected ? "text-gray-900" : "bg-gray-50 text-gray-400"}
                              >
                                <td className="px-4 py-4 align-top">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleEmployee(employee.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    aria-label={`Include ${getEmployeeName(employee)} in payroll`}
                                  />
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-medium text-inherit">{getEmployeeName(employee)}</div>
                                  {!isSelected && (
                                    <div className="mt-1 text-xs font-medium text-gray-500">Excluded from this payroll run</div>
                                  )}
                                </td>
                                <td className="px-4 py-4">{employee.employee_code || "—"}</td>
                                <td className="px-4 py-4">{getDepartmentName(employee)}</td>
                                <td className="px-4 py-4">{getPositionName(employee)}</td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isSelected ? "bg-blue-50 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                                    {normalizeStatus(employee.status)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-20 self-start">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payroll Summary</h2>
                  <p className="text-sm text-gray-500">Review the headcount before generating the payroll run.</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-blue-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase text-blue-700">Employees included</div>
                    <div className="mt-1 text-2xl font-bold text-blue-900">{includedCount}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase text-gray-500">Employees excluded</div>
                    <div className="mt-1 text-2xl font-bold text-gray-800">{excludedCount}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 px-4 py-3">
                    <div className="text-xs font-semibold uppercase text-gray-500">Estimated payroll headcount</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{includedCount}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Payroll period: <span className="font-medium text-gray-900">{getMonthLabel(month)}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading || employeesLoading || includedCount === 0 || employees.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? "Generating..." : "Generate Payroll"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/payroll")}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Confirm payroll generation</h2>
              <p className="mt-2 text-sm text-gray-600">
                Generate payroll for {includedCount} employee{includedCount === 1 ? "" : "s"} for {getMonthLabel(month)}?
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Only the selected employees will be included in this payroll run.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGeneratePayroll()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </HRMSSidebar>
  );
}
