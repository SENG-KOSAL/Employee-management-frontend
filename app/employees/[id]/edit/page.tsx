"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import api from "@/services/api";
import { benefitsService } from "@/services/benefits";
import { leaveTypesService } from "@/services/leaveTypes";
import { leaveAllocationsService, type LeaveAllocation } from "@/services/leaveAllocations";
import type { LeaveType } from "@/types/hr";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, User, Lock, Gift, CalendarClock, Clock } from "lucide-react";
import { workSchedulesService } from "@/services/workSchedules";
type TabType = "personal" | "account" | "benefits" | "attendance" | "work-schedule";

interface CatalogItem {
  id?: number | string;
  name?: string;
  benefit_name?: string;
  deduction_name?: string;
  amount?: number;
  type?: "fixed" | "percentage" | string;
  kind?: "benefit" | "deduction";
}

interface FormData {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  department: string;
  position: string;
  start_date: string;
  salary: number;
  status: string;
  name: string;
  password: string;
  confirm_password: string;
  role: string;
  health_insurance: boolean;
  retirement_plan: boolean; 
  dental_coverage: boolean;
  vision_coverage: boolean;
  tax_percentage: number;
  social_security_percentage: number;
  health_insurance_deduction: number;
}

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "account", label: "User Account", icon: Lock },
  { id: "benefits", label: "Benefits & Deductions", icon: Gift },
  { id: "attendance", label: "Attendance & Leave", icon: CalendarClock },
  { id: "work-schedule", label: "Work Schedule", icon: Clock },
];

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id;

  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [catalogBenefits, setCatalogBenefits] = useState<CatalogItem[]>([]);
  const [catalogDeductions, setCatalogDeductions] = useState<CatalogItem[]>([]);
  const [availableBenefits, setAvailableBenefits] = useState<CatalogItem[]>([]);
  const [availableDeductions, setAvailableDeductions] = useState<CatalogItem[]>([]);
  const [benefitToAdd, setBenefitToAdd] = useState<string>("");
  const [deductionToAdd, setDeductionToAdd] = useState<string>("");
  const [addingBenefit, setAddingBenefit] = useState(false);
  const [addingDeduction, setAddingDeduction] = useState(false);
  const [benefitEdits, setBenefitEdits] = useState<CatalogItem[]>([]);
  const [deductionEdits, setDeductionEdits] = useState<CatalogItem[]>([]);
  const [initialBenefits, setInitialBenefits] = useState<CatalogItem[]>([]);
  const [initialDeductions, setInitialDeductions] = useState<CatalogItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState("");
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [allocationEdits, setAllocationEdits] = useState<Record<number, {
    leave_type_id: number;
    year: number;
    days_allocated: number;
    days_used: number;
    note?: string;
  }>>({});
  const [allocationForm, setAllocationForm] = useState({
    leave_type_id: "",
    year: String(new Date().getFullYear()),
    days_allocated: "",
    days_used: "0",
    note: "",
  });
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState("");
  const [assigningSchedule, setAssigningSchedule] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [scheduleEffectiveFrom, setScheduleEffectiveFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [scheduleAssignError, setScheduleAssignError] = useState("");
  const [scheduleAssignSuccess, setScheduleAssignSuccess] = useState("");
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "male",
    date_of_birth: "",
    address: "",
    department: "",
    position: "",
    start_date: "",
    salary: 0,
    status: "active",
    name: "",
    password: "",
    confirm_password: "",
    role: "employee",
    health_insurance: false,
    retirement_plan: false,
    dental_coverage: false,
    vision_coverage: false,
    tax_percentage: 15,
    social_security_percentage: 6.2,
    health_insurance_deduction: 0,
  });

  const loadLeaveTypes = async () => {
    try {
      setLeaveTypesLoading(true);
      setLeaveTypesError("");
      const res = await leaveTypesService.list();
      const items = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setLeaveTypes(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load leave types", err);
      setLeaveTypesError("Unable to load leave types");
      setLeaveTypes([]);
    } finally {
      setLeaveTypesLoading(false);
    }
  };

  const getDefaultDaysForLeaveType = (leaveTypeId?: string | number) => {
    const ltId = Number(leaveTypeId);
    const selected = leaveTypes.find((lt) => Number(lt.id) === ltId);
    const candidate = selected?.default_days ?? selected?.days_per_year ?? 0;
    return Number.isFinite(Number(candidate)) ? Number(candidate) : 0;
  };

  const loadSchedules = async () => {
    try {
      setSchedulesLoading(true);
      setSchedulesError("");
      const res = await workSchedulesService.list();
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load work schedules", err);
      setSchedulesError("Unable to load work schedules");
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (id) fetchEmployee(id);
    loadLeaveTypes();
    loadSchedules();
  }, [id, router]);

  const fetchEmployee = async (empId: string | number) => {
    try {
      setLoading(true);
      setError("");

      const [empRes, benRes, dedRes, catalogBenRes, catalogDedRes] = await Promise.all([
        api.get(`/api/v1/employees/${empId}`),
        benefitsService.listBenefits(empId),
        benefitsService.listDeductions(empId),
        benefitsService.listBenefits(),
        benefitsService.listDeductions(),
      ]);

      let allocationsRes: any = null;
      try {
        allocationsRes = await leaveAllocationsService.listByEmployee(Number(empId));
      } catch (allocErr) {
        console.warn('Leave allocations lookup failed', allocErr);
      }

      const data = empRes.data.data || empRes.data;

      const benefitsListRaw = (benRes as any)?.data?.data ?? (benRes as any)?.data ?? [];
      const deductionsListRaw = (dedRes as any)?.data?.data ?? (dedRes as any)?.data ?? [];
      const catalogBenefitsRaw = (catalogBenRes as any)?.data?.data ?? (catalogBenRes as any)?.data ?? [];
      const catalogDeductionsRaw = (catalogDedRes as any)?.data?.data ?? (catalogDedRes as any)?.data ?? [];

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

      setCatalogBenefits(normalizedBenefits);
      setCatalogDeductions(normalizedDeductions);
  setBenefitEdits(normalizedBenefits);
  setDeductionEdits(normalizedDeductions);
  setInitialBenefits(normalizedBenefits);
  setInitialDeductions(normalizedDeductions);

      const normalizeAll = (list: any[], kind: "benefit" | "deduction") =>
        Array.isArray(list)
          ? list
              .filter((item) => item && (item.benefit_name || item.deduction_name || item.name))
              .map((item) => ({
                id: item.id,
                benefit_name: kind === "benefit" ? item.benefit_name || item.name : undefined,
                deduction_name: kind === "deduction" ? item.deduction_name || item.name : undefined,
                name: item.name,
                amount: Number(item.amount ?? 0),
                type: item.type === "percentage" ? "percentage" : "fixed",
              }))
          : [];

      const allBenefits = normalizeAll(catalogBenefitsRaw, "benefit");
      const allDeductions = normalizeAll(catalogDeductionsRaw, "deduction");

      const filterAvailable = (all: CatalogItem[], assigned: CatalogItem[]) =>
        all.filter((item) => !assigned.some((a) => Number(a.id) === Number(item.id)));

      setAvailableBenefits(filterAvailable(allBenefits, normalizedBenefits));
      setAvailableDeductions(filterAvailable(allDeductions, normalizedDeductions));

      setFormData((prev) => ({
        ...prev,
        employee_code: data.employee_code || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        gender: data.gender || "male",
        date_of_birth: data.date_of_birth || "",
        address: data.address || "",
        department: data.department || "",
        position: data.position || "",
        start_date: data.start_date || "",
        salary: data.salary ?? 0,
        status: data.status || "active",
        name: data.user?.name || data.full_name || "",
        role: data.role || data.user?.role || "employee",
        // keep password empty for security
        password: "",
        confirm_password: "",
        // optional nested
        health_insurance: data.benefits?.health_insurance ?? false,
        retirement_plan: data.benefits?.retirement_plan ?? false,
        dental_coverage: data.benefits?.dental_coverage ?? false,
        vision_coverage: data.benefits?.vision_coverage ?? false,
        tax_percentage: data.deductions?.tax_percentage ?? 15,
        social_security_percentage: data.deductions?.social_security_percentage ?? 6.2,
        health_insurance_deduction: data.deductions?.health_insurance_deduction ?? 0,
      }));
      setSelectedScheduleId(data?.work_schedule_id ? String(data.work_schedule_id) : "");
      setScheduleEffectiveFrom(
        data?.work_schedule?.effective_from
          ? String(data.work_schedule.effective_from).slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setCurrentSchedule(data?.work_schedule ?? null);
      const allocList = allocationsRes ? (allocationsRes as any)?.data?.data ?? (allocationsRes as any)?.data ?? [] : [];
      const normalizedAllocations: LeaveAllocation[] = Array.isArray(allocList) ? allocList : [];
      setAllocations(normalizedAllocations);
      const edits: Record<number, { leave_type_id: number; year: number; days_allocated: number; days_used: number; note?: string; }> = {};
      normalizedAllocations.forEach((alloc) => {
        edits[alloc.id] = {
          leave_type_id: Number(alloc.leave_type_id),
          year: Number(alloc.year ?? new Date().getFullYear()),
          days_allocated: Number(alloc.days_allocated ?? 0),
          days_used: Number(alloc.days_used ?? 0),
          note: alloc.note ?? "",
        };
      });
      setAllocationEdits(edits);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load employee");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleAllocationFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // When leave type changes, auto-fill days with the leave type default if not already set
    if (name === "leave_type_id") {
      const defaultDays = getDefaultDaysForLeaveType(value);
      setAllocationForm((prev) => ({
        ...prev,
        [name]: value,
        days_allocated: prev.days_allocated === "" ? String(defaultDays) : prev.days_allocated,
      }));
      return;
    }
    setAllocationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAllocationEditChange = (
    id: number,
    field: keyof { leave_type_id: number; year: number; days_allocated: number; days_used: number; note?: string },
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

  const updateBenefitEdit = (id: CatalogItem["id"], field: "amount" | "type", value: any) => {
    setBenefitEdits((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: field === "amount" ? Number(value) : value } : item))
    );
  };

  const updateDeductionEdit = (id: CatalogItem["id"], field: "amount" | "type", value: any) => {
    setDeductionEdits((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: field === "amount" ? Number(value) : value } : item))
    );
  };

  const addBenefitFromCatalog = async () => {
    const selected = availableBenefits.find((b) => String(b.id) === String(benefitToAdd));
    if (!selected || !id) return;
    try {
      setAddingBenefit(true);
      const basePayload = {
        employee_id: Number(id),
        benefit_name: selected.benefit_name || selected.name || "Benefit",
        name: selected.name || selected.benefit_name || "Benefit",
        amount: Number(selected.amount ?? 0),
        type: selected.type === "percentage" ? "percentage" : "fixed",
      } as const;

      try {
        await benefitsService.createBenefit({
          ...basePayload,
          benefit_id: Number(selected.id),
        });
      } catch (err: any) {
        // Fallback: try without benefit_id in case backend doesn't accept it
        await benefitsService.createBenefit(basePayload as any);
      }
      setBenefitToAdd("");
      const newItem: CatalogItem = {
        id: selected.id,
        benefit_name: selected.benefit_name || selected.name || "Benefit",
        name: selected.name || selected.benefit_name || "Benefit",
        amount: Number(selected.amount ?? 0),
        type: selected.type === "percentage" ? "percentage" : "fixed",
      };
      setBenefitEdits((prev) => [...prev, newItem]);
      setInitialBenefits((prev) => [...prev, newItem]);
      setAvailableBenefits((prev) => prev.filter((b) => Number(b.id) !== Number(selected.id)));
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to add benefit");
    } finally {
      setAddingBenefit(false);
    }
  };

  const addDeductionFromCatalog = async () => {
    const selected = availableDeductions.find((d) => String(d.id) === String(deductionToAdd));
    if (!selected || !id) return;
    try {
      setAddingDeduction(true);
      setAddingDeduction(true);
      const basePayload = {
        employee_id: Number(id),
        deduction_name: selected.deduction_name || selected.name || "Deduction",
        name: selected.name || selected.deduction_name || "Deduction",
        amount: Number(selected.amount ?? 0),
        type: selected.type === "percentage" ? "percentage" : "fixed",
      } as const;

      try {
        await benefitsService.createDeduction({
          ...basePayload,
          deduction_id: Number(selected.id),
        });
      } catch (err: any) {
        // Fallback: try without deduction_id in case backend doesn't accept it
        await benefitsService.createDeduction(basePayload as any);
      }
      setDeductionToAdd("");
      const newItem: CatalogItem = {
        id: selected.id,
        deduction_name: selected.deduction_name || selected.name || "Deduction",
        name: selected.name || selected.deduction_name || "Deduction",
        amount: Number(selected.amount ?? 0),
        type: selected.type === "percentage" ? "percentage" : "fixed",
      };
      setDeductionEdits((prev) => [...prev, newItem]);
      setInitialDeductions((prev) => [...prev, newItem]);
      setAvailableDeductions((prev) => prev.filter((d) => Number(d.id) !== Number(selected.id)));
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to add deduction");
    } finally {
      setAddingDeduction(false);
    }
  };

  const diffCatalog = (original: CatalogItem[], edited: CatalogItem[], kind: "benefit" | "deduction") => {
    const updates: CatalogItem[] = [];
    edited.forEach((item) => {
      const base = original.find((o) => o.id === item.id);
      if (!base) return;
      const amountChanged = Number(base.amount ?? 0) !== Number(item.amount ?? 0);
      const typeChanged = (base.type ?? "") !== (item.type ?? "");
      if (amountChanged || typeChanged) {
        updates.push({ ...item, kind });
      }
    });
    return updates;
  };

  const refreshAllocations = async (empId?: number) => {
    const targetId = empId ?? Number(id);
    if (!targetId) return;
    try {
      setAllocLoading(true);
      setAllocError("");
      const res = await leaveAllocationsService.listByEmployee(Number(targetId));
      const allocList = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      const normalized: LeaveAllocation[] = Array.isArray(allocList) ? allocList : [];
      setAllocations(normalized);
      const edits: Record<number, { leave_type_id: number; year: number; days_allocated: number; days_used: number; note?: string }> = {};
      normalized.forEach((a) => {
        edits[a.id] = {
          leave_type_id: Number(a.leave_type_id),
          year: Number(a.year ?? new Date().getFullYear()),
          days_allocated: Number(a.days_allocated ?? 0),
          days_used: Number(a.days_used ?? 0),
          note: a.note ?? "",
        };
      });
      setAllocationEdits(edits);
    } catch (err: any) {
      console.error(err);
      setAllocError(err?.response?.data?.message || "Failed to load leave allocations");
    } finally {
      setAllocLoading(false);
    }
  };

  const addAllocation = async () => {
    if (!id) return;
    const parsedYear = allocationForm.year ? Number(allocationForm.year) : new Date().getFullYear();
    const parsedDays = Number(allocationForm.days_allocated);
    const defaultDays = getDefaultDaysForLeaveType(allocationForm.leave_type_id);
    const resolvedDays = allocationForm.days_allocated === "" ? defaultDays : parsedDays;
    const parsedUsed = Number(allocationForm.days_used ?? 0);
    if (!allocationForm.leave_type_id) {
      setAllocError("Select a leave type to allocate");
      return;
    }
    if (!Number.isFinite(resolvedDays) || resolvedDays < 0) {
      setAllocError("Days allocated must be 0 or more");
      return;
    }
    try {
      setAllocLoading(true);
      setAllocError("");
      await leaveAllocationsService.create({
        employee_id: Number(id),
        leave_type_id: Number(allocationForm.leave_type_id),
        year: parsedYear,
        days_allocated: resolvedDays,
        days_used: Number.isFinite(parsedUsed) ? parsedUsed : 0,
        note: allocationForm.note?.trim() || undefined,
      });
      setAllocationForm((prev) => ({ ...prev, leave_type_id: "", days_allocated: "", days_used: "0", note: "" }));
      await refreshAllocations(Number(id));
    } catch (err: any) {
      console.error(err);
      setAllocError(err?.response?.data?.message || "Failed to add allocation");
    } finally {
      setAllocLoading(false);
    }
  };

  const saveAllocationEdit = async (allocId: number) => {
    if (!id || !allocationEdits[allocId]) return;
    const draft = allocationEdits[allocId];
    try {
      setAllocLoading(true);
      setAllocError("");
      await leaveAllocationsService.update(Number(allocId), {
        employee_id: Number(id),
        leave_type_id: draft.leave_type_id,
        year: draft.year,
        days_allocated: draft.days_allocated,
        days_used: draft.days_used,
        note: draft.note?.trim() || undefined,
      });
      await refreshAllocations(Number(id));
    } catch (err: any) {
      console.error(err);
      setAllocError(err?.response?.data?.message || "Failed to update allocation");
    } finally {
      setAllocLoading(false);
    }
  };

  const deleteAllocation = async (allocId: number) => {
    if (!id) return;
    if (!window.confirm("Delete this leave allocation?")) return;
    try {
      setAllocLoading(true);
      setAllocError("");
      await leaveAllocationsService.remove(Number(allocId));
      await refreshAllocations(Number(id));
    } catch (err: any) {
      console.error(err);
      setAllocError(err?.response?.data?.message || "Failed to delete allocation");
    } finally {
      setAllocLoading(false);
    }
  };

  const handleAssignSchedule = async () => {
    if (!id || !selectedScheduleId) return;
    if (!scheduleEffectiveFrom) {
      setScheduleAssignError("Please choose an effective date");
      return;
    }
    try {
      setAssigningSchedule(true);
      setScheduleAssignError("");
      setScheduleAssignSuccess("");
      const res = await workSchedulesService.assignToEmployee(
        Number(id),
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
      setCurrentSchedule(resolvedSchedule);
      setScheduleAssignSuccess("Work schedule assigned");
      setTimeout(() => setScheduleAssignSuccess(""), 1500);
    } catch (err: any) {
      console.error(err);
      setScheduleAssignError(err?.response?.data?.message || "Failed to assign work schedule");
    } finally {
      setAssigningSchedule(false);
    }
  };

  const validateForm = () => {
    if (!formData.employee_code) {
      setError("Employee code is required");
      return false;
    }
    if (!formData.first_name || !formData.last_name) {
      setError("First name and last name are required");
      return false;
    }
    if (!formData.email) {
      setError("Email is required");
      return false;
    }
    if (!formData.start_date) {
      setError("Start date is required");
      return false;
    }
    if (!formData.salary || formData.salary <= 0) {
      setError("Salary must be greater than 0");
      return false;
    }
    if (formData.password && formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        employee_code: formData.employee_code,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        department: formData.department,
        position: formData.position,
        start_date: formData.start_date,
        salary: formData.salary,
        status: formData.status,
        name: (formData.name || `${formData.first_name} ${formData.last_name}`.trim()).trim(),
        role: formData.role,
        benefits: {
          health_insurance: formData.health_insurance,
          retirement_plan: formData.retirement_plan,
          dental_coverage: formData.dental_coverage,
          vision_coverage: formData.vision_coverage,
        },
        deductions: {
          tax_percentage: formData.tax_percentage,
          social_security_percentage: formData.social_security_percentage,
          health_insurance_deduction: formData.health_insurance_deduction,
        },
      } as any;

      // only send password if provided
      if (formData.password) {
        payload.password = formData.password;
      }

      await api.put(`/api/v1/employees/${id}`, payload);

      const benefitUpdates = diffCatalog(initialBenefits, benefitEdits, "benefit");
      const deductionUpdates = diffCatalog(initialDeductions, deductionEdits, "deduction");

      // Apply catalog updates sequentially to avoid backend race issues
      for (const b of benefitUpdates) {
        if (!b.id) continue;
        await benefitsService.updateBenefit({
          id: Number(b.id),
          employee_id: Number(id),
          benefit_name: b.benefit_name || b.name || "",
          amount: Number(b.amount ?? 0),
          type: b.type === "percentage" ? "percentage" : "fixed",
        });
      }

      for (const d of deductionUpdates) {
        if (!d.id) continue;
        await benefitsService.updateDeduction({
          id: Number(d.id),
          employee_id: Number(id),
          deduction_name: d.deduction_name || d.name || "",
          amount: Number(d.amount ?? 0),
          type: d.type === "percentage" ? "percentage" : "fixed",
        });
      }

      setSuccess("Employee updated successfully!");
      setTimeout(() => {
        router.push(`/employees/${id}`);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update employee");
    } finally {
      setSaving(false);
    }
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
        <Link
          href={id ? `/employees/${id}` : "/employees"}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
          <p className="text-gray-500 mt-1">Update employee details across multiple sections</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {activeTab === "personal" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code *</label>
                    <input
                      type="text"
                      name="employee_code"
                      value={formData.employee_code}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Salary *</label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">User Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={`${formData.first_name} ${formData.last_name}`.trim() || "e.g. john.doe"}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password (leave blank to keep)</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "benefits" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">Benefits (flags)</h2>
                  
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Catalog Benefits</h3>
                      <span className="text-xs text-gray-500">Editable</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={benefitToAdd}
                        onChange={(e) => setBenefitToAdd(e.target.value)}
                      >
                        <option value="">Select benefit to add</option>
                        {availableBenefits.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {b.benefit_name || b.name} {b.amount ? `• ${b.type === "percentage" ? `${b.amount}%` : `$${b.amount}`}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!benefitToAdd || addingBenefit}
                        onClick={addBenefitFromCatalog}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-blue-700"
                      >
                        {addingBenefit ? "Adding..." : "Add"}
                      </button>
                    </div>
                    {benefitEdits.length ? (
                      <div className="space-y-2">
                        {benefitEdits.map((item) => (
                          <div key={`${item.benefit_name || item.name}-${item.id}`} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.benefit_name || item.name}</p>
                                <p className="text-xs text-gray-500">Assigned benefit</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full border ${
                                item.type === "percentage"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-green-50 text-green-700 border-green-200"
                              }`}>
                                {item.type === "percentage" ? "Percent" : "Fixed"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                                <input
                                  type="number"
                                  value={Number(item.amount ?? 0)}
                                  onChange={(e) => updateBenefitEdit(item.id, "amount", e.target.value)}
                                  min={0}
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select
                                  value={item.type === "percentage" ? "percentage" : "fixed"}
                                  onChange={(e) => updateBenefitEdit(item.id, "type", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="percentage">Percent</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No catalog benefits assigned.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Catalog Deductions</h3>
                      <span className="text-xs text-gray-500">Editable</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={deductionToAdd}
                        onChange={(e) => setDeductionToAdd(e.target.value)}
                      >
                        <option value="">Select deduction to add</option>
                        {availableDeductions.map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {d.deduction_name || d.name} {d.amount ? `• ${d.type === "percentage" ? `${d.amount}%` : `$${d.amount}`}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!deductionToAdd || addingDeduction}
                        onClick={addDeductionFromCatalog}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-blue-700"
                      >
                        {addingDeduction ? "Adding..." : "Add"}
                      </button>
                    </div>
                    {deductionEdits.length ? (
                      <div className="space-y-2">
                        {deductionEdits.map((item) => (
                          <div key={`${item.deduction_name || item.name}-${item.id}`} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.deduction_name || item.name}</p>
                                <p className="text-xs text-gray-500">Assigned deduction</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full border ${
                                item.type === "percentage"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-green-50 text-green-700 border-green-200"
                              }`}>
                                {item.type === "percentage" ? "Percent" : "Fixed"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                                <input
                                  type="number"
                                  value={Number(item.amount ?? 0)}
                                  onChange={(e) => updateDeductionEdit(item.id, "amount", e.target.value)}
                                  min={0}
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select
                                  value={item.type === "percentage" ? "percentage" : "fixed"}
                                  onChange={(e) => updateDeductionEdit(item.id, "type", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="percentage">Percent</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No catalog deductions assigned.</p>
                    )}
                  </div>
                </div>

                
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Attendance & Leave</h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  Manage yearly leave allocations per employee. Assign, edit days, or remove allocations as needed.
                </div>

                {allocError ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{allocError}</div> : null}

                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Assign new allocation</h3>
                    {allocLoading ? <span className="text-xs text-gray-500">Working...</span> : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Leave type</label>
                      <select
                        name="leave_type_id"
                        value={allocationForm.leave_type_id}
                        onChange={handleAllocationFormChange}
                        className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select leave type</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt.id} value={lt.id}>
                            {lt.name} {lt.is_paid ? "(paid)" : "(unpaid)"} • {lt.default_days ?? lt.days_per_year ?? "-"} days/year
                          </option>
                        ))}
                      </select>
                      {leaveTypesLoading ? <p className="text-xs text-gray-500">Loading leave types...</p> : null}
                      {leaveTypesError ? <p className="text-xs text-red-600">{leaveTypesError}</p> : null}
                      {allocationForm.leave_type_id ? (
                        <p className="text-xs text-gray-500">Default days: {getDefaultDaysForLeaveType(allocationForm.leave_type_id)}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Year</label>
                      <input
                        type="number"
                        name="year"
                        value={allocationForm.year}
                        onChange={handleAllocationFormChange}
                        className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={2000}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Days allocated</label>
                      <input
                        type="number"
                        name="days_allocated"
                        value={allocationForm.days_allocated}
                        onChange={handleAllocationFormChange}
                        className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={0}
                        step={1}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Days used (optional)</label>
                      <input
                        type="number"
                        name="days_used"
                        value={allocationForm.days_used}
                        onChange={handleAllocationFormChange}
                        className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={0}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
                      <textarea
                        name="note"
                        value={allocationForm.note}
                        onChange={handleAllocationFormChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., default annual allocation"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addAllocation}
                      disabled={allocLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {allocLoading ? "Saving..." : "Assign allocation"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Existing allocations</h3>
                    {allocLoading ? <span className="text-xs text-gray-500">Updating...</span> : null}
                  </div>
                  {allocations.length ? (
                    <div className="space-y-3">
                      {allocations.map((alloc) => {
                        const draft = allocationEdits[alloc.id] || {
                          leave_type_id: Number(alloc.leave_type_id),
                          year: Number(alloc.year ?? new Date().getFullYear()),
                          days_allocated: Number(alloc.days_allocated ?? 0),
                          days_used: Number(alloc.days_used ?? 0),
                          note: alloc.note ?? "",
                        };
                        return (
                          <div
                            key={alloc.id}
                            className="p-4 border border-gray-200 rounded-lg bg-white space-y-3"
                          >
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">Leave type</label>
                                <select
                                  value={draft.leave_type_id}
                                  onChange={(e) => handleAllocationEditChange(alloc.id, "leave_type_id", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  {leaveTypes.map((lt) => (
                                    <option key={lt.id} value={lt.id}>
                                      {lt.name} {lt.is_paid ? "(paid)" : "(unpaid)"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">Year</label>
                                <input
                                  type="number"
                                  value={draft.year}
                                  onChange={(e) => handleAllocationEditChange(alloc.id, "year", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min={2000}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">Days allocated</label>
                                <input
                                  type="number"
                                  value={draft.days_allocated}
                                  onChange={(e) => handleAllocationEditChange(alloc.id, "days_allocated", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min={0}
                                  step={1}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">Days used</label>
                                <input
                                  type="number"
                                  value={draft.days_used}
                                  onChange={(e) => handleAllocationEditChange(alloc.id, "days_used", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min={0}
                                  step={1}
                                />
                              </div>
                              <div className="space-y-1 lg:col-span-1">
                                <label className="block text-xs font-medium text-gray-600">Note</label>
                                <input
                                  type="text"
                                  value={draft.note ?? ""}
                                  onChange={(e) => handleAllocationEditChange(alloc.id, "note", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Optional note"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                Year {draft.year} • Used {draft.days_used} / {draft.days_allocated}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveAllocationEdit(alloc.id)}
                                  disabled={allocLoading}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAllocation(alloc.id)}
                                  disabled={allocLoading}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No leave allocations yet. Add one above.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "work-schedule" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Work Schedule</h2>
                    <p className="text-sm text-gray-500">Assign or change the employee's work schedule and effective date.</p>
                  </div>
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
                  <p className="text-xs text-gray-500">Effective date is required when assigning a schedule.</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Current Schedule</p>
                  {currentSchedule ? (
                    <div className="space-y-1 text-sm text-gray-800">
                      <p className="font-medium text-gray-900">{currentSchedule.name}</p>
                      <p>{currentSchedule.hours_per_day ?? "-"} hours per day</p>
                      {currentSchedule.effective_from ? (
                        <p>Effective from: {currentSchedule.effective_from}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {(currentSchedule.working_days || []).map((d: string) => (
                          <span key={d} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {d.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      {currentSchedule.notes ? <p className="text-sm text-gray-600">{currentSchedule.notes}</p> : null}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No schedule assigned yet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <Link
                href={id ? `/employees/${id}` : "/employees"}
                className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </HRMSSidebar>
  );
}
