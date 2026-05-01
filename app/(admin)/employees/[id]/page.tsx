"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import api from "@/services/api";
import { benefitsService } from "@/services/benefits";
import { leaveAllocationsService } from "@/services/leaveAllocations";
import { leaveTypesService } from "@/services/leaveTypes";
import { overtimesService } from "@/services/overtimes";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, Mail, Phone, Badge, Building2, UserCircle2, User, Lock, Gift, CalendarClock, Clock, Check, X, KeyRound, Shield, FileText, Edit2, CreditCard, MapPin, Plus, MinusCircle } from "lucide-react";
import { workSchedulesService } from "@/services/workSchedules";
import type { LeaveType } from "@/types/hr";
import EmployeePhotoUploader from "@/components/employees/EmployeePhotoUploader";

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
  // Legal
  national_id_number?: string | null;
  nssf_number?: string | null;
  passport_number?: string | null;
  work_permit_number?: string | null;
  nationality?: "khmer" | "foreign" | string | null;
  // Emergency contact
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  // Documents relation (optional)
  documents?: {
    id_card_file_path?: string | null;
    contract_file_path?: string | null;
    cv_file_path?: string | null;
    certificate_file_path?: string | null;
  } | null;
  photo_url?: string | null;
  photo?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  start_date?: string;
  salary?: number;
  benefits?: any;
  deductions?: any;
  user?: { id?: number; name: string; role: string };
  employee_benefits?: CatalogItem[];
  employee_deductions?: CatalogItem[];
  leave_type_id?: number;
  leave_type?: { id: number; name: string; is_paid?: boolean };
  work_schedule_id?: number;
  work_schedule?: { id: number; name: string; working_days?: string[]; hours_per_day?: number; notes?: string | null; effective_from?: string | null };
}

type TabType = "personal" | "account" | "legal" | "documents" | "benefits" | "attendance" | "work-schedule";

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "account", label: "User Account", icon: Lock },
  { id: "legal", label: "Legal & Emergency", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "benefits", label: "Benefits & Deductions", icon: Gift },
  { id: "attendance", label: "Attendance & Leave", icon: CalendarClock },
  { id: "work-schedule", label: "Work Schedule", icon: Clock },
];

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id;
  const searchParams = useSearchParams();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limitedView, setLimitedView] = useState(false);
  const [limitedViewMessage, setLimitedViewMessage] = useState<string>("");
  const [allocations, setAllocations] = useState<any[]>([]);
  const tabParam = searchParams.get("tab");
  const validTabs: TabType[] = ["personal", "account", "legal", "documents", "benefits", "attendance", "work-schedule"];
  const [activeTab, setActiveTab] = useState<TabType>((validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : "personal"));
  const [availableBenefits, setAvailableBenefits] = useState<CatalogItem[]>([]);
  const [availableDeductions, setAvailableDeductions] = useState<CatalogItem[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
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
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [overtimeLoaded, setOvertimeLoaded] = useState(false);
  const [overtimeSaving, setOvertimeSaving] = useState(false);
  const [overtimeError, setOvertimeError] = useState("");
  const [overtimeSuccess, setOvertimeSuccess] = useState("");
  const [overtimeDate, setOvertimeDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [overtimeHours, setOvertimeHours] = useState<string>("");
  const [overtimeReason, setOvertimeReason] = useState<string>("");

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", role: "", password: "", password_confirmation: "" });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const extractPhotoUrl = (obj: unknown): string | null => {
    if (!obj || typeof obj !== "object") return null;
    const rec = obj as Record<string, unknown>;
    const raw =
      rec.photo_url ??
      rec.photoUrl ??
      rec.photo ??
      rec.avatar_url ??
      rec.avatar ??
      rec.profile_photo_url ??
      rec.profile_image_url ??
      rec.image_url ??
      rec.image ??
      null;
    if (raw === null || raw === undefined) return null;
    const url = String(raw);
    if (url.startsWith("/") && apiBase) return `${apiBase.replace(/\/$/, "")}${url}`;
    return url;
  };

  const resolveFileUrl = (raw?: string | null): string | null => {
    if (!raw) return null;
    const url = String(raw).trim();
    if (!url) return null;
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    if (/^(https?:)?\/\//i.test(url)) return url;

    const base = apiBase ? apiBase.replace(/\/$/, "") : "";
    if (!base) return url;
    if (url.startsWith("/")) return `${base}${url}`;
    return `${base}/${url}`;
  };
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
      setOvertimes([]);
      setOvertimeLoading(false);
      setOvertimeLoaded(false);
      setOvertimeSaving(false);
      setOvertimeError("");
      setOvertimeSuccess("");
      setOvertimeHours("");
      setOvertimeReason("");
      setOvertimeDate(new Date().toISOString().slice(0, 10));
      fetchEmployee(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === "benefits" && !benefitsLoaded && !benefitsLoading) {
      loadBenefitsAndDeductions(Number(id));
    }
    if (activeTab === "attendance") {
      if (!allocationsLoaded && !allocationsLoading) {
        loadAttendanceData(Number(id));
      }
      if (!overtimeLoaded && !overtimeLoading) {
        loadOvertimes(Number(id));
      }
    }
    if (activeTab === "work-schedule") {
      if (!schedulesLoaded && !schedulesLoading) {
        loadSchedules();
      }
      if (!scheduleHistoryLoaded) {
        loadEmployeeSchedules(id);
      }
    }
  }, [activeTab, id, benefitsLoaded, benefitsLoading, allocationsLoaded, allocationsLoading, schedulesLoaded, schedulesLoading, scheduleHistoryLoaded, overtimeLoaded, overtimeLoading]);

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

  const loadOvertimes = async (empId: number) => {
    try {
      setOvertimeLoading(true);
      setOvertimeError("");
      const res = await overtimesService.listByEmployee(empId);
      const list = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setOvertimes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setOvertimeError("Failed to load overtime records");
      setOvertimes([]);
    } finally {
      setOvertimeLoading(false);
      setOvertimeLoaded(true);
    }
  };

  const fetchEmployee = async (empId: string | number) => {
    try {
      setLoading(true);
      setLimitedView(false);
      setLimitedViewMessage("");
      const empRes = await api.get(`/api/v1/employees/${empId}`);
      const empData = empRes.data.data || empRes.data;
      setEmployee(empData);
      setAccountForm({
        name: empData?.user?.name || `${empData?.first_name ?? ""} ${empData?.last_name ?? ""}`.trim(),
        role: empData?.user?.role || "employee",
        password: "",
        password_confirmation: "",
      });
      setIsEditingAccount(false);
      setAccountError("");
      setAccountSuccess("");
      if (empData?.work_schedule_id) {
        setSelectedScheduleId(String(empData.work_schedule_id));
      }
      if (empData?.work_schedule?.effective_from) {
        setScheduleEffectiveFrom(String(empData.work_schedule.effective_from).slice(0, 10));
      }
      setError("");
    } catch (err) {
      console.error(err);
      const status = (err as any)?.response?.status as number | undefined;
      const message = (err as any)?.response?.data?.message as string | undefined;

      // If backend forbids /employees/:id for some roles (e.g. company_admin),
      // or tenant-scoped model binding returns 404, fall back to list endpoint.
      if (status === 403 || status === 404) {
        try {
          const listRes = await api.get("/api/v1/employees?per_page=500");
          const listData = (listRes as any)?.data?.data ?? (listRes as any)?.data;
          const rows = Array.isArray(listData) ? listData : Array.isArray(listData?.data) ? listData.data : [];
          const found = rows.find((e: any) => String(e?.id) === String(empId));
          if (found) {
            setEmployee(found);
            setActiveTab("personal");
            setLimitedView(true);
            setLimitedViewMessage(
              message || "Limited view: you don't have permission to access the full employee profile."
            );
            setError("");
            return;
          }
        } catch (fallbackErr) {
          console.error(fallbackErr);
        }
      }

      setError(message || (status === 403 ? "You don't have permission to view this employee." : "Failed to load employee details"));
    } finally {
      setLoading(false);
    }
  };

  const assignBenefit = async () => {
    if (!employee?.id || !selectedBenefitId) return;
    try {
      setAssigning(true);
      setAssignError("");
      setRemoveError("");
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

      if (!created?.id) {
        await loadBenefitsAndDeductions(Number(employee.id));
      }
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
      setRemoveError("");
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

      if (!created?.id) {
        await loadBenefitsAndDeductions(Number(employee.id));
      }
    } catch (err: any) {
      console.error(err);
      setAssignError(err?.response?.data?.message || "Failed to assign deduction");
    } finally {
      setAssigning(false);
    }
  };

  const removeAssignedBenefit = async (rowId?: number | string) => {
    if (!employee?.id || rowId === undefined || rowId === null) return;
    try {
      setRemovingId(`benefit:${String(rowId)}`);
      setRemoveError("");
      setAssignError("");
      await benefitsService.removeBenefit(Number(rowId));
      setEmployee((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.employee_benefits) ? prev.employee_benefits : [];
        return { ...prev, employee_benefits: existing.filter((b) => String(b.id) !== String(rowId)) };
      });
    } catch (err: any) {
      console.error(err);
      setRemoveError(err?.response?.data?.message || "Failed to remove benefit");
    } finally {
      setRemovingId(null);
    }
  };

  const removeAssignedDeduction = async (rowId?: number | string) => {
    if (!employee?.id || rowId === undefined || rowId === null) return;
    try {
      setRemovingId(`deduction:${String(rowId)}`);
      setRemoveError("");
      setAssignError("");
      await benefitsService.removeDeduction(Number(rowId));
      setEmployee((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.employee_deductions) ? prev.employee_deductions : [];
        return { ...prev, employee_deductions: existing.filter((d) => String(d.id) !== String(rowId)) };
      });
    } catch (err: any) {
      console.error(err);
      setRemoveError(err?.response?.data?.message || "Failed to remove deduction");
    } finally {
      setRemovingId(null);
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

  const renderCatalogLine = (
    item: CatalogItem,
    opts?: {
      onRemove?: () => void;
      removing?: boolean;
    }
  ) => {
    const label = item.benefit_name || item.deduction_name || item.name || "-";
    const amount = item.type === "percentage" ? `${item.amount ?? 0}%` : `$${item.amount ?? 0}`;
    const pillStyle =
      item.type === "percentage"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-green-50 text-green-700 border-green-200";

    return (
      <div key={`${String(item.id ?? label)}`} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{item.type === "percentage" ? "Percentage" : "Fixed"} • {amount}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${pillStyle}`}>
            {item.type === "percentage" ? "Percent" : "Fixed"}
          </span>
          {opts?.onRemove ? (
            <button
              type="button"
              onClick={opts.onRemove}
              disabled={opts.removing}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const handleCreateOvertime = async () => {
    if (!employee?.id) return;
    if (!overtimeDate || !overtimeHours) {
      setOvertimeError("Date and hours are required");
      return;
    }
    try {
      setOvertimeSaving(true);
      setOvertimeError("");
      setOvertimeSuccess("");
      const payload = {
        employee_id: Number(employee.id),
        date: overtimeDate,
        hours: Number(overtimeHours),
        reason: overtimeReason || undefined,
      };
      const res = await overtimesService.create(payload as any);
      const created = (res as any)?.data?.data ?? (res as any)?.data ?? payload;
      setOvertimes((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setOvertimeHours("");
      setOvertimeReason("");
      setOvertimeSuccess("Overtime added");
      setTimeout(() => setOvertimeSuccess(""), 1500);
    } catch (err: any) {
      console.error(err);
      setOvertimeError(err?.response?.data?.message || "Failed to add overtime");
    } finally {
      setOvertimeSaving(false);
    }
  };

  const startEditAccount = () => {
    if (!employee) return;
    setAccountForm({
      name: employee.user?.name || `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
      role: employee.user?.role || "employee",
      password: "",
      password_confirmation: "",
    });
    setAccountError("");
    setAccountSuccess("");
    setIsEditingAccount(true);
  };

  const cancelEditAccount = () => {
    if (!employee) {
      setIsEditingAccount(false);
      return;
    }
    setAccountForm({
      name: employee.user?.name || `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
      role: employee.user?.role || "employee",
      password: "",
      password_confirmation: "",
    });
    setAccountError("");
    setAccountSuccess("");
    setIsEditingAccount(false);
  };

  const handleAccountFieldChange = (field: keyof typeof accountForm, value: string) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAccount = async () => {
    if (!employee?.id) return;
    setAccountError("");
    setAccountSuccess("");

    const name = (accountForm.name || `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim()).trim();
    const role = accountForm.role || employee.user?.role || "employee";

    if (!name) {
      setAccountError("Account name is required");
      return;
    }
    if (!role) {
      setAccountError("Role is required");
      return;
    }
    if (accountForm.password && accountForm.password !== accountForm.password_confirmation) {
      setAccountError("Passwords do not match");
      return;
    }

    // ensure core employee fields are present for the update request
    const requiredFields: Array<[string, any]> = [
      ["employee_code", employee.employee_code],
      ["first_name", employee.first_name],
      ["last_name", employee.last_name],
      ["email", employee.email],
      ["start_date", employee.start_date],
      ["salary", employee.salary],
    ];
    const missing = requiredFields.filter(([, v]) => v === undefined || v === null || v === "");
    if (missing.length) {
      setAccountError("Some employee fields are missing. Please edit the employee profile first.");
      return;
    }

    const payload: any = {
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || "",
      gender: employee.gender || "",
      date_of_birth: employee.date_of_birth || "",
      address: employee.address || "",
      department: employee.department || "",
      position: employee.position || "",
      start_date: employee.start_date || "",
      salary: Number(employee.salary ?? 0),
      status: employee.status || "active",
      name,
      role,
      benefits: employee.benefits || {},
      deductions: employee.deductions || {},
    };

    if (accountForm.password) {
      payload.password = accountForm.password;
    }

    try {
      setSavingAccount(true);
      await api.put(`/api/v1/employees/${employee.id}`, payload);
      setEmployee((prev) =>
        prev
          ? {
              ...prev,
              user: { ...(prev.user || {}), name, role },
            }
          : prev
      );
      setAccountSuccess("Account updated");
      setIsEditingAccount(false);
      setAccountForm((prev) => ({ ...prev, password: "", password_confirmation: "" }));
      setTimeout(() => setAccountSuccess(""), 1500);
    } catch (err: any) {
      console.error(err);
      setAccountError(err?.response?.data?.message || "Failed to update account");
    } finally {
      setSavingAccount(false);
    }
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
      <div className="space-y-6 pb-8 bg-gray-50/50 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-3 bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100">
          <Link href="/employees" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Team
          </Link>
          {employee ? (
            <Link
              href={`/employees/${employee.id}/360degree`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              360° View
            </Link>
          ) : null}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}

        {employee && (
          <div className="space-y-6">
            {limitedView && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                {limitedViewMessage || "Limited view: some employee details are not available for your role."}
              </div>
            )}
            
            {/* Employee Banner Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-8 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {!limitedView ? (
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full opacity-30 blur-sm group-hover:opacity-50 transition-opacity"></div>
                      {/* Removed wrapping div with fixed size constraints */}
                      <EmployeePhotoUploader
                        employeeId={employee.id}
                        photoUrl={extractPhotoUrl(employee)}
                        onUploaded={(payload) => {
                          const nextUrl = extractPhotoUrl(payload);
                          setEmployee((prev) => {
                            if (!prev) return prev;
                            const nextObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
                            const merged: EmployeeDetail = {
                              ...prev,
                              ...(nextObj as Partial<EmployeeDetail>),
                            };
                            if (nextUrl) merged.photo_url = nextUrl;
                            return merged;
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 text-3xl font-bold ring-4 ring-white shadow-lg">
                      {`${employee.first_name?.[0] ?? ""}${employee.last_name?.[0] ?? ""}`.trim().toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                      {employee.first_name} {employee.last_name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-sm font-medium border border-gray-200">
                        <Badge className="w-3.5 h-3.5" />
                        {employee.employee_code || "No ID"}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600 font-medium">{employee.position || "No Position"}</span>
                    </div>
                  </div>
                </div>
                
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border flex items-center gap-2 ${
                  employee.status === "active"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : employee.status === "inactive"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    employee.status === "active" ? "bg-green-500" : employee.status === "inactive" ? "bg-red-500" : "bg-amber-500"
                  }`}></span>
                  {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "Pending"}
                </span>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 overflow-x-auto bg-white px-2">
                <div className="flex gap-1 min-w-max px-4">
                  {(limitedView ? tabs.filter((t) => t.id === "personal") : tabs).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group flex items-center gap-2 px-5 py-4 font-medium transition-all relative outline-none ${
                          isActive
                            ? "text-blue-600"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                        {tab.label}
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-8 bg-gray-50/30">
                {activeTab === "personal" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Personal & Employment Information</h3>
                      {!limitedView && (
                        <Link
                          href={`/employees/${id}/edit`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" /> Edit Details
                        </Link>
                      )}
                    </div>
                    
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Contact Info Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Mail className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Contact Information</h4>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</label>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                              {employee.email}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                              {employee.phone || "Not provided"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Job Details Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Job Details</h4>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</label>
                              <div className="text-gray-900 font-medium">{employee.position || "Not assigned"}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                              <div className="text-gray-900 font-medium">{employee.department || "Not assigned"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Demographics Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-purple-50/50 border-b border-purple-100 flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                            <User className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Demographics</h4>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                              <div className="text-gray-900 font-medium capitalize">{employee.gender || "Not specified"}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                              <div className="text-gray-900 font-medium">{employee.date_of_birth || "Not provided"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Employment Terms</h4>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Base Salary</label>
                              <div className="text-gray-900 font-bold text-lg">{formatMoney(employee.salary)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</label>
                              <div className="text-gray-900 font-medium">{employee.start_date || "Not provided"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Location Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow lg:col-span-2">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                          <div className="p-1.5 bg-gray-200 text-gray-600 rounded-lg">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Location</h4>
                        </div>
                        <div className="p-5">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                            <div className="text-gray-900 font-medium">{employee.address || "No address provided"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "account" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">User Account Settings</h3>
                      {!isEditingAccount && (
                        <button
                          type="button"
                          onClick={startEditAccount}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
                        >
                          <KeyRound className="w-4 h-4" />
                          {employee.user ? "Edit Account" : "Create Account"}
                        </button>
                      )}
                    </div>

                    {accountError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {accountError}
                      </div>
                    )}
                    {accountSuccess && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {accountSuccess}
                      </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-200 text-gray-600 rounded-lg">
                          <Lock className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-gray-800">Account Credentials</h4>
                      </div>

                      <div className="p-6">
                        {isEditingAccount ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                                <div className="relative">
                                  <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={accountForm.name}
                                    onChange={(e) => handleAccountFieldChange("name", e.target.value)}
                                    placeholder={`${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || "Account name"}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Role & Permission</label>
                                <div className="relative">
                                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <select
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={accountForm.role}
                                    onChange={(e) => handleAccountFieldChange("role", e.target.value)}
                                  >
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="hr">HR Administrator</option>
                                    <option value="admin">System Admin</option>
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ArrowLeft className="w-3 h-3 -rotate-90" />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">New Password <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <div className="relative">
                                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="password"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={accountForm.password}
                                    onChange={(e) => handleAccountFieldChange("password", e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                <div className="relative">
                                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="password"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={accountForm.password_confirmation}
                                    onChange={(e) => handleAccountFieldChange("password_confirmation", e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-2">
                              <button
                                type="button"
                                onClick={handleSaveAccount}
                                disabled={savingAccount}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                              >
                                {savingAccount ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditAccount}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {employee.user ? (
                              <div className="grid sm:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</p>
                                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                                    <UserCircle2 className="w-4 h-4 text-gray-400" />
                                    {employee.user.name}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</p>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                    {employee.user.role}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System ID</p>
                                  <div className="text-gray-900 font-mono text-sm">#{employee.user.id}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                <div className="p-3 bg-gray-100 rounded-full mb-3">
                                  <Lock className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">No Account Linked</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                                  This employee doesn't have a login account yet. Create one to allow accessing the system.
                                </p>
                                <button
                                  type="button"
                                  onClick={startEditAccount}
                                  className="mt-4 text-blue-600 text-sm font-medium hover:underline"
                                >
                                  Create Account Now
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "benefits" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">Benefits & Deductions</h3>
                    
                    {assignError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {assignError}
                      </div>
                    )}
                    {removeError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {removeError}
                      </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Benefits Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                              <Gift className="w-4 h-4" />
                            </div>
                            <h4 className="font-semibold text-gray-800">Benefits & Allowances</h4>
                          </div>
                        </div>
                        
                        <div className="p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                value={selectedBenefitId}
                                onChange={(e) => setSelectedBenefitId(e.target.value)}
                              >
                                <option value="">Select benefit to add...</option>
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
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2 justify-center"
                              >
                                <Plus className="w-4 h-4" /> Add
                              </button>
                          </div>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {Array.isArray(employee.employee_benefits) && employee.employee_benefits.length > 0 ? (
                              employee.employee_benefits.map((item) =>
                                renderCatalogLine(item, {
                                  onRemove: () => removeAssignedBenefit(item.id),
                                  removing: removingId === `benefit:${String(item.id)}`,
                                })
                              )
                            ) : (
                              <div className="text-center py-6 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No benefits assigned yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deductions Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                              <MinusCircle className="w-4 h-4" />
                            </div>
                            <h4 className="font-semibold text-gray-800">Deductions</h4>
                          </div>
                        </div>
                        
                        <div className="p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                              value={selectedDeductionId}
                              onChange={(e) => setSelectedDeductionId(e.target.value)}
                            >
                              <option value="">Select deduction to add...</option>
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
                              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-2 justify-center"
                            >
                              <Plus className="w-4 h-4" /> Add
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {Array.isArray(employee.employee_deductions) && employee.employee_deductions.length > 0 ? (
                              employee.employee_deductions.map((item) =>
                                renderCatalogLine(item, {
                                  onRemove: () => removeAssignedDeduction(item.id),
                                  removing: removingId === `deduction:${String(item.id)}`,
                                })
                              )
                            ) : (
                              <div className="text-center py-6 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                <MinusCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No deductions assigned yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "attendance" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">Attendance & Leave Management</h3>
                    
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Overtime Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-orange-50/50 border-b border-orange-100 flex items-center gap-2">
                          <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Overtime Log</h4>
                        </div>
                        
                        <div className="p-5 space-y-4">
                          <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                  value={overtimeDate}
                                  onChange={(e) => setOvertimeDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                  value={overtimeHours}
                                  onChange={(e) => setOvertimeHours(e.target.value)}
                                  placeholder="e.g. 2.5"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                value={overtimeReason}
                                onChange={(e) => setOvertimeReason(e.target.value)}
                                placeholder="Optional description..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateOvertime}
                              disabled={overtimeSaving || !overtimeDate || !overtimeHours}
                              className="w-full py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex justify-center items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {overtimeSaving ? "Adding..." : "Log Overtime"}
                            </button>
                            
                            {overtimeError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{overtimeError}</p>}
                            {overtimeSuccess && <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">{overtimeSuccess}</p>}
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Recent Entries</h5>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                              {overtimeLoading ? (
                                <p className="text-sm text-gray-500 italic p-2">Loading records...</p>
                              ) : !overtimes || overtimes.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No overtime recorded</p>
                                </div>
                              ) : (
                                overtimes.map((ot, idx) => (
                                  <div key={ot.id ?? idx} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-orange-200 hover:shadow-sm transition-all group">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-gray-900">{ot.date}</span>
                                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-semibold border border-orange-100">
                                        {ot.hours}h
                                      </span>
                                    </div>
                                    {ot.reason && <p className="text-xs text-gray-500 line-clamp-1">{ot.reason}</p>}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Leave Allocation Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <CalendarClock className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Leave Balance Assignment</h4>
                        </div>
                        
                        <div className="p-5 space-y-4">
                          <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave Type</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                                <option value="">Select type...</option>
                                {leaveTypes.map((lt: any) => (
                                  <option key={lt.id} value={lt.id}>
                                    {lt.name} {lt.is_paid ? "(Paid)" : "(Unpaid)"}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                  value={allocationYear}
                                  onChange={(e) => setAllocationYear(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                  value={allocationDays}
                                  onChange={(e) => setAllocationDays(e.target.value)}
                                  placeholder={selectedLeaveTypeId ? String(getDefaultDaysForLeaveType(selectedLeaveTypeId)) : ""}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleAssignLeave}
                              disabled={savingAllocation || !selectedLeaveTypeId}
                              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex justify-center items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {savingAllocation ? "Saving..." : "Assign Leave"}
                            </button>
                            {allocationError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{allocationError}</p>}
                          </div>

                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Current Allocations</h5>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {Array.isArray(allocations) && allocations.length ? (
                                allocations.map((alloc) => (
                                  <div key={alloc.id ?? `${alloc.leave_type_id}-${alloc.start_date ?? ""}`}
                                    className="p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all">
                                    {editingAllocationId === alloc.id ? (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Allocated</label>
                                            <input
                                              type="number"
                                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                              value={allocationEdits[alloc.id!]?.days_allocated ?? alloc.days_allocated ?? ""}
                                              onChange={(e) => handleAllocationEditChange(alloc.id!, "days_allocated", e.target.value)}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Used</label>
                                            <input
                                              type="number"
                                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                              value={allocationEdits[alloc.id!]?.days_used ?? alloc.days_used ?? 0}
                                              onChange={(e) => handleAllocationEditChange(alloc.id!, "days_used", e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateAllocation(alloc.id!)}
                                            disabled={savingAllocationId === alloc.id}
                                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => cancelEditAllocation(alloc)}
                                            className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded hover:bg-gray-50"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-900 text-sm">{alloc.leave_type?.name || "Unknown Type"}</p>
                                            <span className="text-xs text-gray-400 font-medium">({alloc.year})</span>
                                          </div>
                                          <div className="flex gap-3 text-xs">
                                            <span className="text-gray-600">Total: <span className="font-medium text-gray-900">{alloc.days_allocated || 0}</span></span>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-600">Used: <span className="font-medium text-amber-600">{alloc.days_used || 0}</span></span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => beginEditAllocation(alloc)}
                                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Edit Allocation"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-6 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                  <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No leave allocated</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "work-schedule" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Work Schedule Assignment</h3>
                      <Link
                        href="/settings/work-schedules"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm text-sm font-medium"
                      >
                        <Clock className="w-4 h-4" /> Manage Schedules
                      </Link>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Current Schedule Card */}
                      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Current Schedule</h4>
                        </div>
                        
                        <div className="p-5">
                          {employee.work_schedule ? (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                              <div className="space-y-2">
                                <h5 className="text-lg font-bold text-gray-900">{employee.work_schedule.name}</h5>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span>{employee.work_schedule.hours_per_day ?? "-"} hours/day</span>
                                  {employee.work_schedule.effective_from && (
                                    <>
                                      <span className="text-gray-300">|</span>
                                      <span>Effective: {employee.work_schedule.effective_from}</span>
                                    </>
                                  )}
                                </div>
                                {employee.work_schedule.notes && (
                                  <p className="text-sm text-gray-500 italic">"{employee.work_schedule.notes}"</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                                {(employee.work_schedule.working_days || []).map((d: string) => (
                                  <span key={d} className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {d.slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500 font-medium">No active schedule assigned</p>
                              <p className="text-sm text-gray-400 mt-1">Assign a schedule from the list below</p>
                            </div>
                          )}

                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Change Schedule
                            </h5>
                            
                            <div className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Schedule</label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                  value={selectedScheduleId}
                                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                                  disabled={schedulesLoading}
                                >
                                  <option value="">Select schedule...</option>
                                  {schedules.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.hours_per_day}h)
                                    </option>
                                  ))}
                                </select>
                                {schedulesError && <p className="text-xs text-red-600 mt-1">{schedulesError}</p>}
                              </div>
                              <div className="w-full sm:w-48">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Effective Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                  value={scheduleEffectiveFrom}
                                  onChange={(e) => setScheduleEffectiveFrom(e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAssignSchedule}
                                disabled={assigningSchedule || !selectedScheduleId || !scheduleEffectiveFrom}
                                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                              >
                                {assigningSchedule ? "Saving..." : "Update"}
                              </button>
                            </div>
                            {scheduleAssignError && <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-100">{scheduleAssignError}</p>}
                            {scheduleAssignSuccess && <p className="text-sm text-green-600 mt-2 bg-green-50 p-2 rounded-lg border border-green-100">{scheduleAssignSuccess}</p>}
                          </div>
                        </div>
                      </div>

                      {/* History Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow h-fit">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Assignment History</h4>
                        </div>
                        <div className="p-0">
                          {scheduleHistoryError ? (
                            <div className="p-4 text-sm text-red-600 bg-red-50">{scheduleHistoryError}</div>
                          ) : null}
                          
                          <div className="max-h-[500px] overflow-y-auto">
                            {Array.isArray(scheduleHistory) && scheduleHistory.length ? (
                              <div className="divide-y divide-gray-100">
                                {scheduleHistory.map((item, idx) => {
                                  const sched = item.work_schedule || item;
                                  const isFirst = idx === 0;
                                  return (
                                    <div key={`${item.id ?? idx}-${item.work_schedule_id ?? sched?.id ?? "sched"}`} className={`p-4 hover:bg-gray-50 transition-colors ${isFirst ? "bg-blue-50/30" : ""}`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className={`font-semibold text-sm ${isFirst ? "text-blue-700" : "text-gray-900"}`}>
                                          {sched?.name ?? "Work Schedule"}
                                        </p>
                                        {isFirst && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase">Latest</span>}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <CalendarClock className="w-3 h-3" />
                                        <span>Effective: {item.effective_from || sched?.effective_from || "N/A"}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {(sched?.working_days || []).map((d: string) => (
                                          <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                                            {d.slice(0, 3)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-8 text-center text-gray-400">
                                <p className="text-sm">No history records found.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "legal" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Legal & Emergency</h3>
                      <Link
                        href={`/employees/${id}/edit`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        Edit
                      </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Legal</p>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Nationality</span>
                            <span className="text-gray-900 font-medium">{employee.nationality || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">National ID</span>
                            <span className="text-gray-900 font-medium">{employee.national_id_number || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">NSSF Number</span>
                            <span className="text-gray-900 font-medium">{employee.nssf_number || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Passport Number</span>
                            <span className="text-gray-900 font-medium">{employee.passport_number || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Work Permit</span>
                            <span className="text-gray-900 font-medium">{employee.work_permit_number || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Emergency Contact</p>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Name</span>
                            <span className="text-gray-900 font-medium">{employee.emergency_contact_name || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Phone</span>
                            <span className="text-gray-900 font-medium">{employee.emergency_contact_phone || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600">Relationship</span>
                            <span className="text-gray-900 font-medium">{employee.emergency_contact_relationship || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Employee Documents</h3>
                      <span className="text-xs text-gray-500">(Read-only)</span>
                    </div>

                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="grid gap-3">
                        {(
                          [
                            { key: "id_card_file_path", label: "ID Card" },
                            { key: "contract_file_path", label: "Contract" },
                            { key: "cv_file_path", label: "CV" },
                            { key: "certificate_file_path", label: "Certificate" },
                          ] as const
                        ).map((item) => {
                          const rawPath = employee.documents?.[item.key] ?? null;
                          const url = resolveFileUrl(rawPath);
                          return (
                            <div key={item.key} className="flex items-center justify-between gap-4 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                              <div className="min-w-0 flex items-start gap-2">
                                <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                  <p className="text-xs text-gray-500 truncate" title={rawPath || ""}>{rawPath || "-"}</p>
                                </div>
                              </div>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">No file</span>
                              )}
                            </div>
                          );
                        })}
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