"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import api from "@/services/api";
import { benefitsService } from "@/services/benefits";
import { leaveAllocationsService } from "@/services/leaveAllocations";
import { leaveTypesService } from "@/services/leaveTypes";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, Mail, Phone, Badge, Building2, UserCircle2, User, Lock, Gift, CalendarClock, Clock } from "lucide-react";
import { workSchedulesService } from "@/services/workSchedules";
import type { LeaveType } from "@/types/hr";

interface CatalogItem {
  id?: number | string;
  name?: string;
  benefit_name?: string;
  deduction_name?: string;
  amount?: number;
  type?: "fixed" | "percentage" | string;
}

interface EmployeeDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: string;
  employee_code?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  start_date?: string;
  salary?: number;
  benefits?: any;
  deductions?: any;
  user?: { id: number; name: string; role: string };
  employee_benefits?: CatalogItem[];
  employee_deductions?: CatalogItem[];
  leave_type_id?: number;
  leave_type?: { id: number; name: string; is_paid?: boolean };
  work_schedule_id?: number;
  work_schedule?: { id: number; name: string; working_days?: string[]; hours_per_day?: number; notes?: string | null; effective_from?: string | null };
}

type TabType = "personal" | "account" | "benefits" | "attendance" | "work-schedule";

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "account", label: "User Account", icon: Lock },
  { id: "benefits", label: "Benefits & Deductions", icon: Gift },
  { id: "attendance", label: "Attendance & Leave", icon: CalendarClock },
  { id: "work-schedule", label: "Work Schedule", icon: Clock },
];

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocations, setAllocations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [availableBenefits, setAvailableBenefits] = useState<CatalogItem[]>([]);
  const [availableDeductions, setAvailableDeductions] = useState<CatalogItem[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [selectedBenefitId, setSelectedBenefitId] = useState<string>("");
  const [selectedDeductionId, setSelectedDeductionId] = useState<string>("");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState("");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("");
  const [allocationYear, setAllocationYear] = useState<string>(String(new Date().getFullYear()));
  const [allocationDays, setAllocationDays] = useState<string>("");
  const [allocationNote, setAllocationNote] = useState<string>("");
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [allocationError, setAllocationError] = useState<string>("");
  const [allocationEdits, setAllocationEdits] = useState<Record<number, {
    leave_type_id: number;
    year: number;
    days_allocated: number;
    days_used?: number;
    note?: string;
  }>>({});
  const [savingAllocationId, setSavingAllocationId] = useState<number | null>(null);
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState("");
  const [assigningSchedule, setAssigningSchedule] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [scheduleEffectiveFrom, setScheduleEffectiveFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [scheduleAssignError, setScheduleAssignError] = useState("");
  const [scheduleAssignSuccess, setScheduleAssignSuccess] = useState("");
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]);
  const [scheduleHistoryError, setScheduleHistoryError] = useState("");
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsLoaded, setBenefitsLoaded] = useState(false);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationsLoaded, setAllocationsLoaded] = useState(false);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [scheduleHistoryLoaded, setScheduleHistoryLoaded] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (id) {
      setBenefitsLoaded(false);
      setBenefitsLoading(false);
      setAllocationsLoaded(false);
      setAllocationsLoading(false);
      setSchedulesLoaded(false);
      setScheduleHistoryLoaded(false);
      setScheduleHistory([]);
      setAllocations([]);
      setAvailableBenefits([]);
      setAvailableDeductions([]);
      setAssignError("");
      setAllocationError("");
      setScheduleAssignError("");
      setScheduleAssignSuccess("");
      fetchEmployee(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === "benefits" && !benefitsLoaded && !benefitsLoading) {
      loadBenefitsAndDeductions(Number(id));
    }
    if (activeTab === "attendance" && !allocationsLoaded && !allocationsLoading) {
      loadAttendanceData(Number(id));
    }
    if (activeTab === "work-schedule") {
      if (!schedulesLoaded && !schedulesLoading) {
        loadSchedules();
      }
      if (!scheduleHistoryLoaded) {
        loadEmployeeSchedules(id);
      }
    }
  }, [activeTab, id, benefitsLoaded, benefitsLoading, allocationsLoaded, allocationsLoading, schedulesLoaded, schedulesLoading, scheduleHistoryLoaded]);

  const loadLeaveTypes = async () => {
    try {
      setLeaveTypesLoading(true);
      setLeaveTypesError("");
      const res = await leaveTypesService.list();
      const list = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setLeaveTypes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setLeaveTypesError("Failed to load leave types");
      setLeaveTypes([]);
    } finally {
      setLeaveTypesLoading(false);
    }
  };

  const loadBenefitsAndDeductions = async (empId: number) => {
    try {
      setBenefitsLoading(true);
      setAssignError("");
      const [benRes, dedRes, benCatalogRes, dedCatalogRes] = await Promise.all([
        benefitsService.listBenefits(empId),
        benefitsService.listDeductions(empId),
        benefitsService.listBenefits(),
        benefitsService.listDeductions(),
      ]);

      const benefitsListRaw = (benRes as any)?.data?.data ?? (benRes as any)?.data ?? [];
      const deductionsListRaw = (dedRes as any)?.data?.data ?? (dedRes as any)?.data ?? [];
      const benefitsCatalogRaw = (benCatalogRes as any)?.data?.data ?? (benCatalogRes as any)?.data ?? [];
      const deductionsCatalogRaw = (dedCatalogRes as any)?.data?.data ?? (dedCatalogRes as any)?.data ?? [];

      const normalizedBenefits: CatalogItem[] = Array.isArray(benefitsListRaw)
        ? benefitsListRaw.map((b: any) => ({
            id: b.id,
            benefit_name: b.benefit_name || b.name,
            amount: Number(b.amount ?? 0),
            type: b.type === "percentage" ? "percentage" : "fixed",
          }))
        : [];

      const normalizedDeductions: CatalogItem[] = Array.isArray(deductionsListRaw)
        ? deductionsListRaw.map((d: any) => ({
            id: d.id,
            deduction_name: d.deduction_name || d.name,
            amount: Number(d.amount ?? 0),
            type: d.type === "percentage" ? "percentage" : "fixed",
          }))
        : [];

      const normalizeCatalog = (items: any[], kind: "benefit" | "deduction") =>
        Array.isArray(items)
          ? items
              .filter((i) => i && (i.benefit_name || i.deduction_name || i.name))
              .map((i) => ({
                id: i.id,
                benefit_name: kind === "benefit" ? i.benefit_name || i.name : undefined,
                deduction_name: kind === "deduction" ? i.deduction_name || i.name : undefined,
                name: i.name,
                amount: Number(i.amount ?? 0),
                type: i.type === "percentage" ? "percentage" : "fixed",
              }))
          : [];

      setAvailableBenefits(normalizeCatalog(benefitsCatalogRaw, "benefit"));
      setAvailableDeductions(normalizeCatalog(deductionsCatalogRaw, "deduction"));

      setEmployee((prev) =>
        prev
          ? {
              ...prev,
              employee_benefits: normalizedBenefits.length ? normalizedBenefits : prev.employee_benefits,
              employee_deductions: normalizedDeductions.length ? normalizedDeductions : prev.employee_deductions,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setAssignError("Failed to load benefits or deductions");
    } finally {
      setBenefitsLoading(false);
      setBenefitsLoaded(true);
    }
  };

  const loadSchedules = async () => {
    try {
      setSchedulesLoading(true);
      setSchedulesError("");
      const res = await workSchedulesService.list();
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setSchedulesError("Failed to load work schedules");
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
      setSchedulesLoaded(true);
    }
  };

  const selectLatestSchedule = (items: any[]) => {
    if (!Array.isArray(items) || !items.length) return null;
    const sorted = [...items].sort((a, b) => {
      const aDate = new Date(a.effective_from || a.work_schedule?.effective_from || a.created_at || 0).getTime();
      const bDate = new Date(b.effective_from || b.work_schedule?.effective_from || b.created_at || 0).getTime();
      return bDate - aDate;
    });
    return sorted[0];
  };

  const loadEmployeeSchedules = async (empId: string | number) => {
    try {
      setScheduleHistoryError("");
      const res = await workSchedulesService.listByEmployee(empId);
      const list = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      const normalized = Array.isArray(list) ? list : [];
      setScheduleHistory(normalized);
      const latest = selectLatestSchedule(normalized);
      if (latest && latest.effective_from) {
        setScheduleEffectiveFrom(String(latest.effective_from).slice(0, 10));
      }
      if (latest && !employee?.work_schedule) {
        const resolved = latest.work_schedule || latest;
        setEmployee((prev) =>
          prev
            ? {
                ...prev,
                work_schedule_id: latest.work_schedule_id || resolved.id || prev.work_schedule_id,
                work_schedule: resolved,
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
      setScheduleHistoryError("Failed to load schedule history");
      setScheduleHistory([]);
    } finally {
      setScheduleHistoryLoaded(true);
    }
  };

  const loadAllocations = async (empId: number) => {
    try {
      setAllocationsLoading(true);
      setAllocationError("");
      const allocRes = await leaveAllocationsService.listByEmployee(Number(empId));
      const allocList = (allocRes as any)?.data?.data ?? (allocRes as any)?.data ?? [];
      setAllocations(Array.isArray(allocList) ? allocList : []);
      const edits: Record<number, { leave_type_id: number; year: number; days_allocated: number; days_used?: number; note?: string }> = {};
      (Array.isArray(allocList) ? allocList : []).forEach((alloc: any) => {
        if (alloc?.id !== undefined) {
          edits[alloc.id] = {
            leave_type_id: Number(alloc.leave_type_id),
            year: Number(alloc.year ?? new Date().getFullYear()),
            days_allocated: Number(alloc.days_allocated ?? 0),
            days_used: Number(alloc.days_used ?? 0),
            note: alloc.note ?? "",
          };
        }
      });
      setAllocationEdits(edits);
    } catch (err) {
      console.error(err);
      setAllocationError("Failed to load leave allocations");
      setAllocations([]);
    } finally {
      setAllocationsLoading(false);
      setAllocationsLoaded(true);
    }
  };

  const loadAttendanceData = async (empId: number) => {
    await Promise.all([loadLeaveTypes(), loadAllocations(empId)]);
  };

  const fetchEmployee = async (empId: string | number) => {
    try {
      setLoading(true);
      const empRes = await api.get(`/api/v1/employees/${empId}`);
      const empData = empRes.data.data || empRes.data;
      setEmployee(empData);
      if (empData?.work_schedule_id) {
        setSelectedScheduleId(String(empData.work_schedule_id));
      }
      if (empData?.work_schedule?.effective_from) {
        setScheduleEffectiveFrom(String(empData.work_schedule.effective_from).slice(0, 10));
      }
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  const assignBenefit = async () => {
    if (!employee?.id || !selectedBenefitId) return;
    try {
      setAssigning(true);
      setAssignError("");
      const selected = availableBenefits.find((b) => String(b.id) === String(selectedBenefitId));
      const res = await benefitsService.createBenefit({
        employee_id: Number(employee.id),
        benefit_id: Number(selectedBenefitId),
        benefit_name: selected?.benefit_name || selected?.name,
        name: selected?.benefit_name || selected?.name,
        amount: selected?.amount,
        type: selected?.type === "percentage" ? "percentage" : selected?.type === "fixed" ? "fixed" : undefined,
      });
      setSelectedBenefitId("");
      const created = (res as any)?.data?.data ?? (res as any)?.data ?? null;
      setEmployee((prev) => {
        if (!prev) return prev;
        const nextItem: CatalogItem = {
          id: created?.id ?? Number(selectedBenefitId),
          benefit_name: selected?.benefit_name || selected?.name,
          name: selected?.benefit_name || selected?.name,
          amount: selected?.amount,
          type: selected?.type === "percentage" ? "percentage" : "fixed",
        };
        const existing = Array.isArray(prev.employee_benefits) ? prev.employee_benefits : [];
        return { ...prev, employee_benefits: [...existing, nextItem] };
      });
    } catch (err: any) {
      console.error(err);
      setAssignError(err?.response?.data?.message || "Failed to assign benefit");
    } finally {
      setAssigning(false);
    }
  };

  const assignDeduction = async () => {
    if (!employee?.id || !selectedDeductionId) return;
    try {
      setAssigning(true);
      setAssignError("");
      const selected = availableDeductions.find((d) => String(d.id) === String(selectedDeductionId));
      const res = await benefitsService.createDeduction({
        employee_id: Number(employee.id),
        deduction_id: Number(selectedDeductionId),
        deduction_name: selected?.deduction_name || selected?.name,
        name: selected?.deduction_name || selected?.name,
        amount: selected?.amount,
        type: selected?.type === "percentage" ? "percentage" : selected?.type === "fixed" ? "fixed" : undefined,
      });
      setSelectedDeductionId("");
      const created = (res as any)?.data?.data ?? (res as any)?.data ?? null;
      setEmployee((prev) => {
        if (!prev) return prev;
        const nextItem: CatalogItem = {
          id: created?.id ?? Number(selectedDeductionId),
          deduction_name: selected?.deduction_name || selected?.name,
          name: selected?.deduction_name || selected?.name,
          amount: selected?.amount,
          type: selected?.type === "percentage" ? "percentage" : "fixed",
        };
        const existing = Array.isArray(prev.employee_deductions) ? prev.employee_deductions : [];
        return { ...prev, employee_deductions: [...existing, nextItem] };
      });
    } catch (err: any) {
      console.error(err);
      setAssignError(err?.response?.data?.message || "Failed to assign deduction");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignSchedule = async () => {
    if (!employee?.id || !selectedScheduleId) return;
    if (!scheduleEffectiveFrom) {
      setScheduleAssignError("Please choose an effective date");
      return;
    }
    try {
      setAssigningSchedule(true);
      setScheduleAssignError("");
      setScheduleAssignSuccess("");
      const res = await workSchedulesService.assignToEmployee(
        Number(employee.id),
        Number(selectedScheduleId),
        scheduleEffectiveFrom
      );
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? null;
      const selected = schedules.find((s) => String(s.id) === String(selectedScheduleId));
      const resolvedSchedule = {
        ...(data?.work_schedule || data || selected || {
          id: Number(selectedScheduleId),
          name: selected?.name || "Work Schedule",
          working_days: selected?.working_days,
          hours_per_day: selected?.hours_per_day,
          notes: selected?.notes,
        }),
        effective_from: data?.effective_from ?? data?.work_schedule?.effective_from ?? scheduleEffectiveFrom,
      };
      setEmployee((prev) =>
        prev
          ? { ...prev, work_schedule_id: Number(selectedScheduleId), work_schedule: resolvedSchedule }
          : prev
      );
      setScheduleHistory((prev) => [{
        ...(data || {}),
        work_schedule: resolvedSchedule,
        work_schedule_id: Number(selectedScheduleId),
        effective_from: resolvedSchedule.effective_from,
      }, ...(Array.isArray(prev) ? prev : [])]);
      setSchedulesLoaded(true);
      setScheduleHistoryLoaded(true);
      setScheduleAssignSuccess("Work schedule assigned");
      setTimeout(() => setScheduleAssignSuccess(""), 1500);
    } catch (err: any) {
      console.error(err);
      setScheduleAssignError(err?.response?.data?.message || "Failed to assign work schedule");
    } finally {
      setAssigningSchedule(false);
    }
  };

  const formatMoney = (value?: number) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    return `$${Number(value).toLocaleString()}`;
  };

  const formatPercent = (value?: number) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    return `${Number(value).toFixed(1)}%`;
  };

  const getDefaultDaysForLeaveType = (leaveTypeId?: string) => {
    const ltId = Number(leaveTypeId);
    const selected = leaveTypes.find((lt: any) => Number(lt.id) === ltId);
    const fallback = selected?.default_days ?? selected?.days_per_year ?? 0;
    return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
  };

  const handleAssignLeave = async () => {
    if (!employee?.id || !selectedLeaveTypeId) return;
    try {
      setSavingAllocation(true);
      setAllocationError("");
      const defaultDays = getDefaultDaysForLeaveType(selectedLeaveTypeId);
      const payload = {
        employee_id: Number(employee.id),
        leave_type_id: Number(selectedLeaveTypeId),
        year: Number(allocationYear) || new Date().getFullYear(),
        days_allocated: Number(allocationDays || defaultDays),
        note: allocationNote || undefined,
      };
      const res = await leaveAllocationsService.create(payload as any);
      const createdRaw = (res as any)?.data?.data ?? (res as any)?.data ?? payload;
      const selected = leaveTypes.find((lt) => Number(lt.id) === Number(selectedLeaveTypeId));
      const leaveTypeData = createdRaw.leave_type ?? selected ?? (createdRaw.leave_type_id ? { id: Number(selectedLeaveTypeId), name: (selected as any)?.name } : undefined);
      const created = {
        ...createdRaw,
        leave_type: leaveTypeData,
      };
      setAllocations((prev) => [created, ...prev]);
      if (created?.id !== undefined) {
        setAllocationEdits((prev) => ({
          ...prev,
          [created.id]: {
            leave_type_id: Number(created.leave_type_id),
            year: Number(created.year ?? new Date().getFullYear()),
            days_allocated: Number(created.days_allocated ?? 0),
            days_used: Number(created.days_used ?? 0),
            note: created.note ?? "",
          },
        }));
      }
      setAllocationYear(String(new Date().getFullYear()));
      setAllocationDays("");
      setAllocationNote("");
      setSelectedLeaveTypeId("");
    } catch (err: any) {
      console.error(err);
      setAllocationError(err?.response?.data?.message || "Failed to assign leave type");
    } finally {
      setSavingAllocation(false);
    }
  };

  const renderCatalogLine = (item: CatalogItem) => {
    const label = item.benefit_name || item.deduction_name || item.name || "-";
    const amount = item.type === "percentage" ? `${item.amount ?? 0}%` : `$${item.amount ?? 0}`;
    const pillStyle =
      item.type === "percentage"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-green-50 text-green-700 border-green-200";

    return (
      <div key={`${label}-${item.id ?? Math.random()}`} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-white">
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{item.type === "percentage" ? "Percentage" : "Fixed"} • {amount}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${pillStyle}`}>
          {item.type === "percentage" ? "Percent" : "Fixed"}
        </span>
      </div>
    );
  };

  const handleAllocationEditChange = (
    id: number,
    field: keyof { leave_type_id: number; year: number; days_allocated: number; days_used?: number; note?: string },
    value: string
  ) => {
    setAllocationEdits((prev) => ({
      ...prev,
      [id]: {
        leave_type_id: Number(field === "leave_type_id" ? value : prev[id]?.leave_type_id ?? 0),
        year: Number(field === "year" ? value : prev[id]?.year ?? new Date().getFullYear()),
        days_allocated: Number(field === "days_allocated" ? value : prev[id]?.days_allocated ?? 0),
        days_used: Number(field === "days_used" ? value : prev[id]?.days_used ?? 0),
        note: field === "note" ? value : prev[id]?.note ?? "",
      },
    }));
  };

  const handleUpdateAllocation = async (id: number) => {
    const edit = allocationEdits[id];
    if (!edit) return;
    try {
      setSavingAllocationId(id);
      setAllocationError("");
      const res = await leaveAllocationsService.update(id, {
        leave_type_id: edit.leave_type_id,
        year: edit.year,
        days_allocated: edit.days_allocated,
        days_used: edit.days_used,
        note: edit.note,
      } as any);
      const updatedRaw = (res as any)?.data?.data ?? (res as any)?.data ?? edit;
      const selected = leaveTypes.find((lt) => Number(lt.id) === Number(edit.leave_type_id));
      const leaveTypeData = updatedRaw.leave_type ?? selected ?? (updatedRaw.leave_type_id ? { id: edit.leave_type_id, name: (selected as any)?.name } : undefined);
      const updated = { ...updatedRaw, leave_type: leaveTypeData };
      setAllocations((prev) => prev.map((alloc) => (Number(alloc.id) === Number(id) ? { ...alloc, ...updated } : alloc)));
      setEditingAllocationId(null);
    } catch (err: any) {
      console.error(err);
      setAllocationError(err?.response?.data?.message || "Failed to update allocation");
    } finally {
      setSavingAllocationId(null);
    }
  };

  const beginEditAllocation = (alloc: any) => {
    if (alloc?.id === undefined) return;
    const base = {
      leave_type_id: Number(alloc.leave_type_id),
      year: Number(alloc.year ?? new Date().getFullYear()),
      days_allocated: Number(alloc.days_allocated ?? 0),
      days_used: Number(alloc.days_used ?? 0),
      note: alloc.note ?? "",
    };
    setAllocationEdits((prev) => ({ ...prev, [alloc.id]: prev[alloc.id] ?? base }));
    setEditingAllocationId(alloc.id);
  };

  const cancelEditAllocation = (alloc: any) => {
    if (alloc?.id === undefined) return;
    const reset = {
      leave_type_id: Number(alloc.leave_type_id),
      year: Number(alloc.year ?? new Date().getFullYear()),
      days_allocated: Number(alloc.days_allocated ?? 0),
      days_used: Number(alloc.days_used ?? 0),
      note: alloc.note ?? "",
    };
    setAllocationEdits((prev) => ({ ...prev, [alloc.id]: reset }));
    setEditingAllocationId(null);
    setAllocationError("");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        <Link href="/employees" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {employee && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-lg font-semibold">
                    {employee.first_name?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </h1>
                    <p className="text-sm text-gray-500">Employee Code: {employee.employee_code || "-"}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${employee.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {employee.status || "Active"}
                </span>
              </div>

              <div className="flex gap-0 border-b border-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === tab.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {activeTab === "personal" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Personal & Employment</h3>
                      <Link
                        href={`/employees/${id}/edit`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        Edit
                      </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4" /> {employee.email}</div>
                      <div className="flex items-center gap-2 text-gray-700"><Phone className="w-4 h-4" /> {employee.phone || "-"}</div>
                      <div className="flex items-center gap-2 text-gray-700"><Badge className="w-4 h-4" /> Position: {employee.position || "-"}</div>
                      <div className="flex items-center gap-2 text-gray-700"><Building2 className="w-4 h-4" /> Department: {employee.department || "-"}</div>
                      <div className="text-gray-700 text-sm">Gender: {employee.gender || "-"}</div>
                      <div className="text-gray-700 text-sm">Date of Birth: {employee.date_of_birth || "-"}</div>
                      <div className="text-gray-700 text-sm">Start Date: {employee.start_date || "-"}</div>
                      <div className="text-gray-700 text-sm">Salary: {formatMoney(employee.salary)}</div>
                      <div className="text-gray-700 text-sm sm:col-span-2">Address: {employee.address || "-"}</div>
                    </div>
                  </div>
                )}

                {activeTab === "account" && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">User Account</h3>
                    {employee.user ? (
                      <div className="space-y-2 text-gray-700 text-sm">
                        <div className="flex items-center gap-2"><UserCircle2 className="w-4 h-4" /> {employee.user.name}</div>
                        <div className="text-gray-700">Role: {employee.user.role}</div>
                        <div className="text-gray-700">User ID: {employee.user.id}</div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No account linked</p>
                    )}
                  </div>
                )}

                {activeTab === "benefits" && (
                  <div className="space-y-6">
                    {assignError ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{assignError}</div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Benefits (flags)</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          <p>Health Insurance: {employee.benefits?.health_insurance ? "Yes" : "No"}</p>
                          <p>Retirement Plan: {employee.benefits?.retirement_plan ? "Yes" : "No"}</p>
                          <p>Dental Coverage: {employee.benefits?.dental_coverage ? "Yes" : "No"}</p>
                          <p>Vision Coverage: {employee.benefits?.vision_coverage ? "Yes" : "No"}</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Deductions (amounts)</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          <p>Tax: {formatPercent(employee.deductions?.tax_percentage)}</p>
                          <p>Social Security: {formatPercent(employee.deductions?.social_security_percentage)}</p>
                          <p>Health Insurance Deduction: {formatMoney(employee.deductions?.health_insurance_deduction)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">Catalog Benefits</p>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                              value={selectedBenefitId}
                              onChange={(e) => setSelectedBenefitId(e.target.value)}
                            >
                              <option value="">Select benefit</option>
                              {availableBenefits.map((b) => (
                                <option key={b.id} value={String(b.id)}>
                                  {b.benefit_name || b.name} {b.amount ? `• ${b.type === "percentage" ? `${b.amount}%` : `$${b.amount}`}` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={assignBenefit}
                              disabled={assigning || !selectedBenefitId}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md disabled:opacity-50 hover:bg-blue-700"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                        {Array.isArray(employee.employee_benefits) && employee.employee_benefits.length > 0 ? (
                          <div className="space-y-2">
                            {employee.employee_benefits.map((item) => renderCatalogLine(item))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No catalog benefits assigned.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">Catalog Deductions</p>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                              value={selectedDeductionId}
                              onChange={(e) => setSelectedDeductionId(e.target.value)}
                            >
                              <option value="">Select deduction</option>
                              {availableDeductions.map((d) => (
                                <option key={d.id} value={String(d.id)}>
                                  {d.deduction_name || d.name} {d.amount ? `• ${d.type === "percentage" ? `${d.amount}%` : `$${d.amount}`}` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={assignDeduction}
                              disabled={assigning || !selectedDeductionId}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md disabled:opacity-50 hover:bg-blue-700"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                        {Array.isArray(employee.employee_deductions) && employee.employee_deductions.length > 0 ? (
                          <div className="space-y-2">
                            {employee.employee_deductions.map((item) => renderCatalogLine(item))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No catalog deductions assigned.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "attendance" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800">Attendance & Leave</h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      Leave allocations are shown below. Use the form to add or change the default leave type for this employee.
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="min-w-48 flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Leave type</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={selectedLeaveTypeId}
                            onChange={(e) => {
                              setSelectedLeaveTypeId(e.target.value);
                              if (!allocationDays) {
                                const nextDefault = getDefaultDaysForLeaveType(e.target.value);
                                setAllocationDays(nextDefault ? String(nextDefault) : "");
                              }
                            }}
                            disabled={leaveTypesLoading}
                          >
                            <option value="">Select leave type</option>
                            {leaveTypes.map((lt: any) => (
                              <option key={lt.id} value={lt.id}>
                                {lt.name} {lt.is_paid ? "(Paid)" : "(Unpaid)"}
                              </option>
                            ))}
                          </select>
                          {leaveTypesError && <p className="text-xs text-red-600 mt-1">{leaveTypesError}</p>}
                        </div>
                        <div className="min-w-32">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={allocationYear}
                            onChange={(e) => setAllocationYear(e.target.value)}
                          />
                        </div>
                        <div className="min-w-32">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Days</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={allocationDays}
                            onChange={(e) => setAllocationDays(e.target.value)}
                            placeholder={selectedLeaveTypeId ? String(getDefaultDaysForLeaveType(selectedLeaveTypeId)) : ""}
                          />
                        </div>
                        <div className="min-w-48 flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Note (optional)</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={allocationNote}
                            onChange={(e) => setAllocationNote(e.target.value)}
                            placeholder="e.g., Default annual leave"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAssignLeave}
                          disabled={savingAllocation || !selectedLeaveTypeId}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingAllocation ? "Saving..." : "Assign"}
                        </button>
                      </div>
                      {allocationError && <p className="text-sm text-red-600">{allocationError}</p>}
                    </div>
                    {Array.isArray(allocations) && allocations.length ? (
                      <div className="space-y-3">
                        {allocations.map((alloc) => (
                          <div key={alloc.id ?? `${alloc.leave_type_id}-${alloc.start_date ?? ""}`}
                            className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 flex items-center justify-between">
                            {editingAllocationId === alloc.id ? (
                              <div className="space-y-2 flex-1">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Leave type</label>
                                    <select
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                                      value={allocationEdits[alloc.id!]?.leave_type_id ?? alloc.leave_type_id}
                                      onChange={(e) => handleAllocationEditChange(alloc.id!, "leave_type_id", e.target.value)}
                                    >
                                      {leaveTypes.map((lt) => (
                                        <option key={lt.id} value={lt.id}>
                                          {lt.name} {lt.is_paid ? "(Paid)" : "(Unpaid)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Year</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                                      value={allocationEdits[alloc.id!]?.year ?? alloc.year ?? ""}
                                      onChange={(e) => handleAllocationEditChange(alloc.id!, "year", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Days allocated</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                                      value={allocationEdits[alloc.id!]?.days_allocated ?? alloc.days_allocated ?? ""}
                                      onChange={(e) => handleAllocationEditChange(alloc.id!, "days_allocated", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Days used</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                                      value={allocationEdits[alloc.id!]?.days_used ?? alloc.days_used ?? 0}
                                      onChange={(e) => handleAllocationEditChange(alloc.id!, "days_used", e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-gray-700">Note</label>
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-black"
                                    value={allocationEdits[alloc.id!]?.note ?? alloc.note ?? ""}
                                    onChange={(e) => handleAllocationEditChange(alloc.id!, "note", e.target.value)}
                                    placeholder="Optional note"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">Type ID: {alloc.leave_type_id}</p>
                                  <div className="flex items-center gap-2">
                                    {alloc.leave_type?.is_paid !== undefined ? (
                                      <span className={`text-xs px-2 py-1 rounded-full border ${alloc.leave_type.is_paid ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                        {alloc.leave_type.is_paid ? "Paid" : "Unpaid"}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAllocation(alloc.id!)}
                                      disabled={savingAllocationId === alloc.id}
                                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {savingAllocationId === alloc.id ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => cancelEditAllocation(alloc)}
                                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-300 hover:bg-gray-200"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-medium text-gray-900">{alloc.leave_type?.name || "Leave Type"}</p>
                                  <p className="text-xs text-gray-500">Year: {alloc.year ?? "-"}</p>
                                  <p className="text-xs text-gray-500">Days: used {alloc.days_used ?? 0} / allocated {alloc.days_allocated ?? 0}</p>
                                  {alloc.note ? <p className="text-xs text-gray-500">Note: {alloc.note}</p> : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  {alloc.leave_type?.is_paid !== undefined ? (
                                    <span className={`text-xs px-2 py-1 rounded-full border ${alloc.leave_type.is_paid ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                      {alloc.leave_type.is_paid ? "Paid" : "Unpaid"}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => beginEditAllocation(alloc)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md shadow-sm hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No leave allocations found. Use edit to assign a leave type.</p>
                    )}
                  </div>
                )}

                {activeTab === "work-schedule" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Work Schedule Assignment</h3>
                      <Link href="/settings/work-schedules" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Manage Schedules
                      </Link>
                    </div>

                    <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="min-w-56 flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Select Schedule</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={selectedScheduleId}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                            disabled={schedulesLoading}
                          >
                            <option value="">Choose schedule</option>
                            {schedules.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} • {s.hours_per_day}h/day
                              </option>
                            ))}
                          </select>
                          {schedulesError && <p className="text-xs text-red-600 mt-1">{schedulesError}</p>}
                        </div>
                        <div className="min-w-40">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Effective From</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                            value={scheduleEffectiveFrom}
                            onChange={(e) => setScheduleEffectiveFrom(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAssignSchedule}
                          disabled={assigningSchedule || !selectedScheduleId || !scheduleEffectiveFrom}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {assigningSchedule ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                      {scheduleAssignError && <p className="text-sm text-red-600">{scheduleAssignError}</p>}
                      {scheduleAssignSuccess && <p className="text-sm text-green-600">{scheduleAssignSuccess}</p>}
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Current Schedule</p>
                      {employee.work_schedule ? (
                        <div className="space-y-1 text-sm text-gray-800">
                          <p className="font-medium text-gray-900">{employee.work_schedule.name}</p>
                          <p>{employee.work_schedule.hours_per_day ?? "-"} hours per day</p>
                          {employee.work_schedule.effective_from ? (
                            <p>Effective from: {employee.work_schedule.effective_from}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            {(employee.work_schedule.working_days || []).map((d: string) => (
                              <span key={d} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {d.toUpperCase()}
                              </span>
                            ))}
                          </div>
                          {employee.work_schedule.notes ? (
                            <p className="text-sm text-gray-600">{employee.work_schedule.notes}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No schedule assigned yet.</p>
                      )}
                      <div className="pt-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Assignments (latest first)</p>
                        {scheduleHistoryError ? (
                          <p className="text-xs text-red-600">{scheduleHistoryError}</p>
                        ) : null}
                        {Array.isArray(scheduleHistory) && scheduleHistory.length ? (
                          <div className="space-y-2">
                            {scheduleHistory.map((item, idx) => {
                              const sched = item.work_schedule || item;
                              return (
                                <div key={`${item.id ?? idx}-${item.work_schedule_id ?? sched?.id ?? "sched"}`} className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-900">{sched?.name ?? "Work Schedule"}</p>
                                    <span className="text-xs text-gray-500">{item.effective_from || sched?.effective_from || ""}</span>
                                  </div>
                                  <p className="text-xs text-gray-600">{sched?.hours_per_day ?? "-"} hours/day</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(sched?.working_days || []).map((d: string) => (
                                      <span key={d} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                        {d.toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                  {sched?.notes ? <p className="text-xs text-gray-600 mt-1">{sched.notes}</p> : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No history found.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HRMSSidebar>
  );
}


//this page is for view detail of a single employee