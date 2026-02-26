"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { leaveTypesService } from "@/services/leaveTypes";
import { leaveAllocationsService } from "@/services/leaveAllocations";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface EmployeeOption {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
}

interface LeaveTypeOption {
  id: number;
  name?: string;
  code?: string;
  default_days?: number;
  days_per_year?: number;
}

export default function CreateLeaveRequestPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [types, setTypes] = useState<LeaveTypeOption[]>([]);
  const [assignedTypes, setAssignedTypes] = useState<LeaveTypeOption[] | null>(null);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [allocLoading, setAllocLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [totalDays, setTotalDays] = useState<number | null>(null);
  const [dayType, setDayType] = useState<"full" | "half">("full");
  const [partialDay, setPartialDay] = useState<"none" | "start" | "end">("none");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOptions = async () => {
    try {
      const [empRes, typeRes] = await Promise.all([
        api.get("/api/v1/employees?per_page=200"),
        leaveTypesService.list(),
      ]);
      const empData = empRes.data?.data ?? empRes.data;
      const empList = Array.isArray(empData) ? empData : empData?.data ?? [];
      setEmployees(empList);
      const typeData = typeRes?.data ?? typeRes;
      setTypes(Array.isArray(typeData) ? typeData : (typeData as any)?.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load employees or leave types");
    }
  };

  useEffect(() => {
    const fetchAllocations = async () => {
      if (!employeeId) {
        setAssignedTypes(null);
        setTypeId("");
        return;
      }
      try {
        setAllocLoading(true);
        const res = await leaveAllocationsService.listByEmployee(Number(employeeId));
        const allocations = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray((res as any)?.data?.data)
              ? (res as any).data.data
              : [];
        const uniqueIds = new Set<number>();
        const assigned = allocations
          .map((a: any) => a.leave_type || types.find((t) => t.id === a.leave_type_id))
          .filter((t: any) => t && t.id && !uniqueIds.has(t.id) && uniqueIds.add(t.id));
        setAssignedTypes(assigned as LeaveTypeOption[]);
        if (assigned.length === 0) {
          setTypeId("");
        } else if (assigned.length > 0 && typeId && !uniqueIds.has(Number(typeId))) {
          setTypeId("");
        }
      } catch (err) {
        console.error("Failed to load assigned leave types", err);
        setAssignedTypes([]);
        setTypeId("");
      } finally {
        setAllocLoading(false);
      }
    };

    fetchAllocations();
  }, [employeeId, typeId, types]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!employeeId || !typeId || !start || !end) {
      setError("Employee, leave type, start, and end dates are required.");
      return;
    }
    if (new Date(end) < new Date(start)) {
      setError("End date cannot be before start date.");
      return;
    }
    if (totalDays === null) {
      setError("Days field is required. Pick valid start and end dates.");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        employee_id: Number(employeeId),
        leave_type_id: Number(typeId),
        start_date: start,
        end_date: end,
        days: totalDays,
        reason: reason.trim() || undefined,
        status: "pending",
      };
      const res = await api.post("/api/v1/leave-requests", payload);
      const created = res.data?.data ?? res.data;
      setSuccess("Leave request created.");
      setTimeout(() => setSuccess(""), 3000);
      if (created?.id) router.push(`/leave-requests`);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to create leave request";
      setError(message);
      console.error("Create leave error", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const updateTotalDays = (
    startDate: string,
    endDate: string,
    length: "full" | "half" = dayType,
    partial: "none" | "start" | "end" = partialDay,
  ) => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      setTotalDays(null);
      if (dayType === "half" && startDate !== endDate) setDayType("full");
      setPartialDay("none");
      return;
    }

    const sameDay = startDate === endDate;
    if (!sameDay && length === "half") {
      setDayType("full");
    }

    const diffMs = e.getTime() - s.getTime();
    const baseDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    if (sameDay) {
      const effectiveType = length === "half" ? "half" : "full";
      setTotalDays(effectiveType === "half" ? 0.5 : 1);
      setPartialDay("none");
      return;
    }

    let computed = baseDays;
    if (partial === "start" || partial === "end") {
      computed = computed - 0.5;
    }
    setTotalDays(computed);
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ label: number; date: string } | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
      cells.push({ label: d, date: dateStr });
    }
    return cells;
  }, [currentMonth]);

  const isSelected = (date: string) => start === date || end === date;
  const inRange = (date: string) => {
    if (!start || !end) return false;
    return new Date(date) >= new Date(start) && new Date(date) <= new Date(end);
  };

  const handleDayClick = (date: string) => {
    if (!start || (start && end)) {
      setStart(date);
      setEnd("");
      setPartialDay("none");
      setTotalDays(null);
      return;
    }

    if (start && !end) {
      const startDate = new Date(start);
      const newDate = new Date(date);

      if (newDate < startDate) {
        setStart(date);
        setEnd(start);
        setPartialDay("none");
        updateTotalDays(date, start, "full", "none");
      } else if (newDate.getTime() === startDate.getTime()) {
        setEnd(date);
        updateTotalDays(start, date, dayType, "none");
      } else {
        setEnd(date);
        setPartialDay("none");
        updateTotalDays(start, date, "full", "none");
      }
    }
  };

  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [currentMonth],
  );

  const handleDayTypeChange = (value: "full" | "half") => {
    const singleDay = start && end && start === end;
    const nextType = value === "half" && !singleDay ? "full" : value;
    setDayType(nextType);
    if (start && end) {
      updateTotalDays(start, end, nextType, partialDay);
    }
  };

  const handlePartialChange = (value: "none" | "start" | "end") => {
    setPartialDay(value);
    if (start && end) {
      updateTotalDays(start, end, dayType, value);
    }
  };

  const handleStartInputChange = (value: string) => {
    setStart(value);
    if (!value) {
      setEnd("");
      setTotalDays(null);
      setPartialDay("none");
      return;
    }
    if (end) {
      updateTotalDays(value, end, dayType, partialDay);
    }
  };

  const handleEndInputChange = (value: string) => {
    setEnd(value);
    if (!value) {
      setTotalDays(null);
      setPartialDay("none");
      return;
    }
    if (start) {
      updateTotalDays(start, value, dayType, partialDay);
    }
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Create Leave Request</h1>
            <p className="text-sm text-gray-500">Submit leave on behalf of an employee.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <User className="w-4 h-4" />
              </div>
              Request Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Employee</label>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employee by name or code"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    setTypeId("");
                  }}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select employee</option>
                  {employees
                    .filter((emp) => {
                      const term = employeeSearch.trim().toLowerCase();
                      if (!term) return true;
                      const name = `${emp.full_name || ""} ${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
                      const code = (emp.employee_code || "").toLowerCase();
                      return name.includes(term) || code.includes(term);
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`} {emp.employee_code ? `(${emp.employee_code})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Leave type</label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  required
                  disabled={(employeeId && (assignedTypes?.length ?? 0) === 0) || allocLoading}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                >
                  <option value="">{allocLoading ? "Loading..." : employeeId ? "Select assigned leave type" : "Select leave type"}</option>
                  {(employeeId ? assignedTypes ?? [] : types).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.code} {t.days_per_year ?? t.default_days ? `(${t.days_per_year ?? t.default_days} days/yr)` : ""}
                    </option>
                  ))}
                </select>
                {employeeId && (assignedTypes?.length ?? 0) === 0 && !allocLoading && (
                  <p className="text-xs text-gray-500">No leave types are assigned to this employee yet.</p>
                )}
                {typeId && (employeeId ? assignedTypes ?? [] : types).find((t) => `${t.id}` === typeId)?.default_days !== undefined && (
                  <p className="text-xs text-gray-500">
                    Annual allowance: {(employeeId ? assignedTypes ?? [] : types).find((t) => `${t.id}` === typeId)?.days_per_year ?? (employeeId ? assignedTypes ?? [] : types).find((t) => `${t.id}` === typeId)?.default_days} days
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <CalendarIcon className="w-4 h-4" />
              </div>
              Schedule
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 uppercase">Selected dates</span>
                {start ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold">Start: {start}</span>
                    {end && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-semibold">End: {end}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500">Pick a start date</span>
                )}
                {start && (
                  <button
                    type="button"
                    onClick={() => {
                      setStart("");
                      setEnd("");
                      setTotalDays(null);
                      setDayType("full");
                      setPartialDay("none");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 text-xs text-gray-500">
                <span>Step 1: click a start day. Step 2: click an end day to finish the range.</span>
                <span>Tap the same day twice for a single-day request; use half-day options below if needed.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">Start date</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => handleStartInputChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">End date</label>
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => handleEndInputChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {start && end && start === end && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Duration Step
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleDayTypeChange("full")}
                    className={`relative flex items-center justify-between p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      dayType === "full"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600 shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">Full Day (1.0)</span>
                    {dayType === "full" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDayTypeChange("half")}
                    className={`relative flex items-center justify-between p-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      dayType === "half"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600 shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">Half Day (0.5)</span>
                    {dayType === "half" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                </div>
              </div>
            )}

            {start && end && start !== end && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Partial Day Options
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "none", label: "Full Days Only", sub: "Standard range" },
                    { id: "start", label: "Half Start", sub: "0.5 on first day" },
                    { id: "end", label: "Half End", sub: "0.5 on last day" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePartialChange(opt.id as any)}
                      className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 ${
                        partialDay === opt.id
                          ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-sm font-semibold ${partialDay === opt.id ? "text-blue-700" : "text-gray-700"}`}>
                          {opt.label}
                        </span>
                        {partialDay === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">{opt.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 pl-1">
                  Use "Half Start" or "Half End" for requests like 3.5 days.
                </p>
              </div>
            )}

            {totalDays !== null && (
              <div className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-xs uppercase text-gray-500 font-semibold">Total</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">{totalDays} day{totalDays === 1 ? "" : "s"}</span>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-semibold text-gray-800">{monthLabel}</div>
                </div>
                <div className="text-xs text-gray-600 flex flex-col items-end">
                  {!start && !end && <span>Step 1: click a start date.</span>}
                  {start && !end && <span>Step 2: click an end date.</span>}
                  {start && end && <span>Selected {start}{end !== start ? ` to ${end}` : ""}</span>}
                </div>
              </div>

              <div className="text-[11px] text-gray-500 flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white border border-blue-600">Start</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border-blue-100">In range</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white border border-blue-600 opacity-80">End</span>
                <span>Click any date to set start, then another date to set end.</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-sm">
                {daysInMonth.map((cell, idx) => {
                  if (!cell) return <div key={idx} />;
                  const selected = isSelected(cell.date);
                  const ranged = inRange(cell.date);
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => handleDayClick(cell.date)}
                      className={`w-full aspect-square rounded-lg border text-sm font-medium transition-all duration-150 ${
                        selected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105 z-10"
                          : ranged
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-white text-gray-700 border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      {cell.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
              <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
                <FileText className="w-4 h-4" />
              </div>
              Additional Notes
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Reason or notes"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Create Request"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/leave-requests")}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </HRMSSidebar>
  );
}
