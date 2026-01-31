"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { benefitsService } from "@/services/benefits";
import { uploadEmployeeDocuments, uploadEmployeePhoto, type EmployeeDocumentsUpload } from "@/services/employees";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, User, Lock, Gift, CalendarClock, Clock, Shield, FileText, Upload, CheckCircle, AlertCircle, X } from "lucide-react";
import { leaveTypesService } from "@/services/leaveTypes";
import { leaveAllocationsService } from "@/services/leaveAllocations";
import type { LeaveType } from "@/types/hr";
import { workSchedulesService } from "@/services/workSchedules";
  // Removed leaveRequestsService import

type TabType = "personal" | "account" | "legal" | "documents" | "compensation" | "attendance" | "work-schedule";

type BenefitDraft = {
  name: string;
  amount: number;
  type: "fixed" | "percentage";
};

type BenefitOption = BenefitDraft & { id: number };

type DepartmentOption = {
  id: number;
  name: string;
  status?: "active" | "inactive";
};

interface FormData {
  // Personal Info
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
  // User Account
  name: string;
  password: string;
  confirm_password: string;
  role: string;
  // Benefits
  health_insurance: boolean;
  retirement_plan: boolean;
  dental_coverage: boolean;
  vision_coverage: boolean;
  // Deductions
  tax_percentage: number;
  social_security_percentage: number;
  health_insurance_deduction: number;
  // Legal + Emergency
  nationality: string;
  national_id_number: string;
  nssf_number: string;
  passport_number: string;
  work_permit_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "account", label: "User Account", icon: Lock },
  { id: "legal", label: "Legal & Emergency", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "compensation", label: "Benefits & Deductions", icon: Gift },
  { id: "attendance", label: "Attendance & Leave", icon: CalendarClock },
  { id: "work-schedule", label: "Work Schedule", icon: Clock },
];

export default function CreateEmployeePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<EmployeeDocumentsUpload>({});
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const [availableBenefits, setAvailableBenefits] = useState<BenefitOption[]>([]);
  const [availableDeductions, setAvailableDeductions] = useState<BenefitOption[]>([]);
  const [selectedBenefits, setSelectedBenefits] = useState<number[]>([]);
  const [selectedDeductions, setSelectedDeductions] = useState<number[]>([]);
  const [benefitToAddId, setBenefitToAddId] = useState<string>("");
  const [deductionToAddId, setDeductionToAddId] = useState<string>("");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [scheduleEffectiveFrom, setScheduleEffectiveFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: "",
  });
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
    nationality: "",
    national_id_number: "",
    nssf_number: "",
    passport_number: "",
    work_permit_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const loadDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const res = await api.get("/api/v1/departments");
        const list = (res.data?.data ?? []) as any[];
        const normalized: DepartmentOption[] = Array.isArray(list)
          ? list
              .filter((d) => d && typeof d.name === "string")
              .map((d) => ({
                id: Number(d.id),
                name: String(d.name),
                status: d.status === "inactive" ? "inactive" : "active",
              }))
          : [];
        setDepartments(normalized);
      } catch {
        // if API fails, keep list empty (selection-only)
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    const loadBenefitCatalog = async () => {
      try {
        const [bRes, dRes] = await Promise.all([
          benefitsService.listBenefits(),
          benefitsService.listDeductions(),
        ]);

        const benefitsList = (bRes as any)?.data?.data ?? (bRes as any)?.data ?? [];
        const deductionsList = (dRes as any)?.data?.data ?? (dRes as any)?.data ?? [];

        const normalizedBenefits: BenefitOption[] = Array.isArray(benefitsList)
          ? benefitsList
              .filter((b: any) => b && (b.benefit_name || b.name))
              .map((b: any) => ({
                id: Number(b.id),
                name: b.benefit_name ?? b.name,
                amount: Number(b.amount ?? 0),
                type: b.type === "percentage" ? "percentage" : "fixed",
              }))
          : [];

        const normalizedDeductions: BenefitOption[] = Array.isArray(deductionsList)
          ? deductionsList
              .filter((d: any) => d && (d.deduction_name || d.name))
              .map((d: any) => ({
                id: Number(d.id),
                name: d.deduction_name ?? d.name,
                amount: Number(d.amount ?? 0),
                type: d.type === "percentage" ? "percentage" : "fixed",
              }))
          : [];

        setAvailableBenefits(normalizedBenefits);
        setAvailableDeductions(normalizedDeductions);
      } catch (err) {
        console.error("Failed to load benefits/deductions", err);
        setAvailableBenefits([]);
        setAvailableDeductions([]);
      }
    };

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

    loadDepartments();
    loadBenefitCatalog();
    loadLeaveTypes();
    loadSchedules();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const hasSelectedDocuments = Boolean(
    documentFiles.id_card || documentFiles.contract || documentFiles.cv || documentFiles.certificate
  );

  const updateDocumentFile = (key: keyof EmployeeDocumentsUpload, file: File | null) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [key]: file,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const toggleSelection = (kind: "benefit" | "deduction", id: number) => {
    if (kind === "benefit") {
      setSelectedBenefits((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
    } else {
      setSelectedDeductions((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
    }
  };

  const addSelection = (kind: "benefit" | "deduction", idValue: string) => {
    const id = Number(idValue);
    if (!Number.isFinite(id)) return;
    if (kind === "benefit") {
      setSelectedBenefits((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setBenefitToAddId("");
    } else {
      setSelectedDeductions((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setDeductionToAddId("");
    }
  };

  const activeDepartments = departments.filter((d) => (d.status ?? "active") === "active");
  const isValidDepartmentName = (name: string) => activeDepartments.some((d) => d.name === name);

  const handleLeaveInput = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const getDefaultDaysForLeaveType = (leaveTypeId?: string | number) => {
    const ltId = Number(leaveTypeId);
    const selected = leaveTypes.find((lt) => Number(lt.id) === ltId);
    const candidate = selected?.default_days ?? selected?.days_per_year ?? 0;
    return Number.isFinite(Number(candidate)) ? Number(candidate) : 0;
  };

  const validateForm = () => {
    setDepartmentError("");
    if (!formData.first_name || !formData.last_name) {
      setError("First name and last name are required");
      return false;
    }
    const missing: string[] = [];
    const employeeCode = String(formData.employee_code ?? "").trim();
    const firstName = String(formData.first_name ?? "").trim();
    const lastName = String(formData.last_name ?? "").trim();
    const email = String(formData.email ?? "").trim();
    const phone = String(formData.phone ?? "").trim();
    const dateOfBirth = String(formData.date_of_birth ?? "").trim();
    const address = String(formData.address ?? "").trim();
    const department = String(formData.department ?? "").trim();
    const position = String(formData.position ?? "").trim();
    const startDate = String(formData.start_date ?? "").trim();
    const status = String(formData.status ?? "").trim();
    const accountName = String(formData.name ?? "").trim();
    const role = String(formData.role ?? "").trim();
    const password = String(formData.password ?? "");
    const confirmPassword = String(formData.confirm_password ?? "");
    const salaryValue = Number(formData.salary);

    if (!employeeCode) missing.push("Employee Code");
    if (!firstName) missing.push("First Name");
    if (!lastName) missing.push("Last Name");
    if (!email) missing.push("Email");
    if (!phone) missing.push("Phone");
    if (!dateOfBirth) missing.push("Date of Birth");
    if (!address) missing.push("Address");
    if (!department) missing.push("Department");
    if (!position) missing.push("Position");
    if (!startDate) missing.push("Start Date");
    if (!Number.isFinite(salaryValue) || salaryValue <= 0) missing.push("Salary");
    if (!status) missing.push("Status");
    if (!accountName) missing.push("User Account Name");
    if (!role) missing.push("Role");
    if (!password) missing.push("Password");
    if (!confirmPassword) missing.push("Confirm Password");

    if (missing.length > 0) {
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (selectedScheduleId && !scheduleEffectiveFrom) {
      setError("Please choose an effective date for the work schedule");
      return false;
    }

    if (!isValidDepartmentName(department)) {
      setDepartmentError("Please select a department from the list.");
      setError("Please select a valid department");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepartmentError("");
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError("");

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        employee_code: formData.employee_code,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        department: formData.department,
        position: formData.position,
        start_date: formData.start_date,
        salary: formData.salary,
        status: formData.status,
        nationality: formData.nationality,
        national_id_number: formData.national_id_number,
        nssf_number: formData.nssf_number,
        passport_number: formData.passport_number,
        work_permit_number: formData.work_permit_number,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        name: (formData.name || `${formData.first_name} ${formData.last_name}`.trim()).trim(),
        password: formData.password,
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
      };

      const res = await api.post("/api/v1/employees", payload);
      const employeeId = res.data?.data?.id ?? res.data?.id;

      let photoUploadWarning = "";
      if (employeeId && photoFile) {
        try {
          await uploadEmployeePhoto(employeeId, photoFile);
        } catch (photoErr: any) {
          const msg = photoErr?.response?.data?.message || "Photo upload failed";
          console.warn("Employee created, but photo upload failed", photoErr);
          photoUploadWarning = msg;
        }
      }

      let documentsUploadWarning = "";
      if (employeeId && hasSelectedDocuments) {
        try {
          await uploadEmployeeDocuments(employeeId, documentFiles, "post");
        } catch (docErr: any) {
          const msg = docErr?.response?.data?.message || "Documents upload failed";
          console.warn("Employee created, but documents upload failed", docErr);
          documentsUploadWarning = msg;
        }
      }

      if (employeeId) {
        const selectedBenefitItems = availableBenefits.filter((b) => selectedBenefits.includes(b.id));
        const selectedDeductionItems = availableDeductions.filter((d) => selectedDeductions.includes(d.id));

        if (selectedBenefitItems.length) {
          await Promise.all(
            selectedBenefitItems.map((b) =>
              benefitsService.createBenefit({
                benefit_id: Number(b.id),
                employee_id: Number(employeeId),
                benefit_name: b.name || "Benefit",
                name: b.name || "Benefit",
                amount: Number(b.amount ?? 0),
                type: b.type === "percentage" ? "percentage" : "fixed",
              })
            )
          );
        }

        if (selectedDeductionItems.length) {
          await Promise.all(
            selectedDeductionItems.map((d) =>
              benefitsService.createDeduction({
                deduction_id: Number(d.id),
                employee_id: Number(employeeId),
                deduction_name: d.name || "Deduction",
                name: d.name || "Deduction",
                amount: Number(d.amount ?? 0),
                type: d.type === "percentage" ? "percentage" : "fixed",
              })
            )
          );
        }

        if (leaveForm.leave_type_id) {
          try {
            const defaultDays = getDefaultDaysForLeaveType(leaveForm.leave_type_id);
            await leaveAllocationsService.create({
              employee_id: Number(employeeId),
              leave_type_id: Number(leaveForm.leave_type_id),
              year: formData.start_date ? Number(new Date(formData.start_date).getFullYear()) : new Date().getFullYear(),
              // use the leave type's configured default/days-per-year as the allocation
              days_allocated: defaultDays,
              days_used: 0,
              // send optional dates if backend accepts; using start_date as baseline
              start_date: formData.start_date || undefined,
              end_date: formData.start_date || undefined,
              note: "Default leave type allocation",
            });
          } catch (allocErr) {
            console.warn("Leave allocation create failed", allocErr);
          }
        }

        if (selectedScheduleId) {
          try {
            await workSchedulesService.assignToEmployee(
              Number(employeeId),
              Number(selectedScheduleId),
              scheduleEffectiveFrom
            );
          } catch (schedErr: any) {
            console.warn("Work schedule assignment failed", schedErr);
            setError(
              schedErr?.response?.data?.message
                ? `Employee created, but schedule not assigned: ${schedErr.response.data.message}`
                : "Employee created, but assigning work schedule failed"
            );
          }
        }

      }

      setSuccess(
        photoUploadWarning || documentsUploadWarning
          ? `Employee created, but some uploads failed: ${[
              photoUploadWarning ? `Photo: ${photoUploadWarning}` : null,
              documentsUploadWarning ? `Documents: ${documentsUploadWarning}` : null,
            ]
              .filter(Boolean)
              .join(" | ")}. You can retry in the employee profile.`
          : "Employee created successfully! Redirecting to details..."
      );
      if (employeeId) {
        // Go straight to the new employee's detail page to avoid extra navigation hops
        setTimeout(() => {
          router.push(`/employees/${employeeId}`);
        }, 400);
      } else {
        setTimeout(() => {
          router.push("/employees");
        }, 400);
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      setError(apiMessage || "Failed to create employee");
      console.error("Create employee error", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HRMSSidebar>
      <div className="max-w-5xl mx-auto space-y-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/employees" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Employees
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Employee</h1>
            <p className="text-gray-500 mt-1">Fill in the information below to onboard a new staff member.</p>
          </div>
          {/* Progress or Actions could go here */}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 flex-1">{error}</div>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 flex-1">{success}</div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs - Scrollable */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                      isActive
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Personal Info Tab */}
            {activeTab === "personal" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Photo Upload Section */}
                <div className="flex flex-col sm:flex-row items-start gap-6 p-6 border border-gray-100 rounded-2xl bg-gray-50/50">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-gray-300">
                      {photoFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={URL.createObjectURL(photoFile)} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 stroke-1" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Upload Photo">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Upload a professional photo for the employee profile. Accepted formats: JPG, PNG. Max size: 5MB.
                    </p>
                    {photoFile && (
                      <button
                        type="button"
                        onClick={() => setPhotoFile(null)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Identity */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <User className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Identity & Contact</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Code <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="employee_code"
                          value={formData.employee_code}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                          placeholder="EMP-001"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                          placeholder="employee@company.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          placeholder="+855 ..."
                        />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                        <div className="relative">
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                           </div>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                        />
                      </div>
                       <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          placeholder="House No, Street, City..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Employment Details</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={(e) => {
                            setDepartmentError("");
                            setFormData((prev) => ({ ...prev, department: e.target.value }));
                          }}
                          onBlur={(e) => {
                            const value = e.currentTarget.value.trim();
                            if (!value) return;
                            if (!isValidDepartmentName(value)) {
                              setDepartmentError("Please select a department from the list.");
                              setFormData((prev) => ({ ...prev, department: "" }));
                            }
                          }}
                          list="department-options"
                          placeholder={
                            departmentsLoading
                              ? "Loading..."
                              : activeDepartments.length === 0
                                ? "No departments"
                                : "Search..."
                          }
                          disabled={departmentsLoading || activeDepartments.length === 0}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 disabled:bg-gray-50"
                        />
                        <datalist id="department-options">
                          {activeDepartments.map((d) => (
                            <option key={d.id} value={d.name} />
                          ))}
                        </datalist>
                        {departmentError && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{departmentError}</p>}
                      </div>
                      <div className="sm:col-span-2">
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                        <input
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          placeholder="e.g. Senior Developer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary ($) <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          name="salary"
                          value={formData.salary}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                          required
                        />
                      </div>
                       <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Status</label>
                        <div className="relative">
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                             className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="on_leave">On Leave</option>
                          </select>
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                    <Lock className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Account Credentials</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Set up the login credentials for this employee. They will use the <strong>Name</strong> (or Email) and <strong>Password</strong> to access the system.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={`${formData.first_name} ${formData.last_name}`.trim() || "john.doe"}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                    <div className="relative">
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                      </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                       </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Legal & Emergency Tab */}
            {activeTab === "legal" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-6">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Legal Documents</h3>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality</label>
                      <div className="relative">
                        <select
                          name="nationality"
                          value={formData.nationality}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                        >
                          <option value="">Select Nationality</option>
                          <option value="khmer">Khmer</option>
                          <option value="foreign">Foreign</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                       </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">National ID Number</label>
                      <input
                        type="text"
                        name="national_id_number"
                        value={formData.national_id_number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                        placeholder="e.g. 012345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">NSSF Number</label>
                      <input
                        type="text"
                        name="nssf_number"
                        value={formData.nssf_number}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Passport Number</label>
                      <input
                        type="text"
                        name="passport_number"
                        value={formData.passport_number}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Permit Number</label>
                      <input
                        type="text"
                        name="work_permit_number"
                        value={formData.work_permit_number}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Emergency Contact</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship to Employee</label>
                      <input
                        type="text"
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        onChange={handleInputChange}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                         placeholder="e.g. Spouse, Parent, Sibling"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
                    <p className="text-sm text-gray-500">Official documents for employee records.</p>
                  </div>
                   {hasSelectedDocuments && (
                     <button
                        type="button"
                        onClick={() => setDocumentFiles({})}
                        className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                      >
                       Clear all files
                      </button>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: "id_card", label: "National ID Card" },
                    { key: "contract", label: "Employment Contract" },
                    { key: "cv", label: "Curriculum Vitae (CV)" },
                    { key: "certificate", label: "Certificate / Degree" },
                  ].map((doc) => {
                    const file = documentFiles[doc.key as keyof EmployeeDocumentsUpload];
                    return (
                        <div key={doc.key} className="space-y-2">
                        <span className="block text-sm font-medium text-gray-700">{doc.label}</span>
                        <div className={`relative border-2 border-dashed rounded-xl p-8 hover:bg-gray-50 transition-colors text-center group cursor-pointer ${file ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => updateDocumentFile(doc.key as keyof EmployeeDocumentsUpload, e.target.files?.[0] ?? null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                            {file ? (
                              <>
                                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-50">{file.name}</p>
                                     <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                  </div>
                                   <div className="text-xs text-blue-600 font-medium">Click to replace</div>
                              </>
                            ) : (
                                <>
                                  <div className="p-3 bg-gray-100 text-gray-400 rounded-full group-hover:bg-gray-200 group-hover:text-gray-500 transition-colors">
                                    <Upload className="w-6 h-6" />
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <span className="font-semibold text-blue-600">Click to upload</span>
                                  </div>
                                  <p className="text-xs text-gray-400">PDF or Image (MJPG, PNG)</p>
                                </>
                            )}
                          </div>
                        </div>
                         {file && (
                             <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); updateDocumentFile(doc.key as keyof EmployeeDocumentsUpload, null); }}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mt-1 font-medium z-20 relative"
                            > 
                              <X className="w-3 h-3"/> Remove {doc.label}
                            </button>
                         )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compensation Tab */}
            {activeTab === "compensation" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Benefits & Deductions</h2>
                    <p className="text-sm text-gray-500">Configure payroll components for this employee.</p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Benefits Section */}
                  <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-green-600"/> Benefits
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Allowances and perks added to salary.</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{selectedBenefits.length} selected</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <select
                          className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
                          value={benefitToAddId}
                          onChange={(e) => setBenefitToAddId(e.target.value)}
                          disabled={availableBenefits.length === 0}
                        >
                          <option value="">Select benefit to add...</option>
                          {availableBenefits.map((b) => (
                            <option key={b.id} value={String(b.id)}>
                              {b.name} {b.amount ? `(${b.type === "percentage" ? `${b.amount}%` : `$${b.amount}`})` : ""}
                            </option>
                          ))}
                        </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSelection("benefit", benefitToAddId)}
                        disabled={!benefitToAddId}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        Add
                      </button>
                    </div>

                    <div className="bg-gray-50/50 rounded-xl border border-gray-100 flex-1 overflow-y-auto max-h-75 p-2">
                        {selectedBenefits.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                             <Gift className="w-8 h-8 mb-2 opacity-20"/>
                             <p className="text-sm">No benefits added yet.</p>
                           </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedBenefits.map((id) => {
                              const b = availableBenefits.find((x) => x.id === id);
                              if (!b) return null;
                              return (
                                <div key={id} className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{b.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                          b.type === "percentage"
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-green-50 text-green-700 border-green-100"
                                        }`}>
                                        {b.type === "percentage" ? "%" : "$"}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                         {b.type === "percentage" ? `${b.amount}%` : `$${b.amount}`}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelection("benefit", id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Remove"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
                     <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600"/> Deductions
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Tax, insurance, and other withholdings.</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{selectedDeductions.length} selected</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                       <div className="relative flex-1">
                        <select
                          className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none transition-all"
                          value={deductionToAddId}
                          onChange={(e) => setDeductionToAddId(e.target.value)}
                          disabled={availableDeductions.length === 0}
                        >
                          <option value="">Select deduction to add...</option>
                          {availableDeductions.map((d) => (
                            <option key={d.id} value={String(d.id)}>
                              {d.name} {d.amount ? `(${d.type === "percentage" ? `${d.amount}%` : `$${d.amount}`})` : ""}
                            </option>
                          ))}
                        </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSelection("deduction", deductionToAddId)}
                        disabled={!deductionToAddId}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        Add
                      </button>
                    </div>

                     <div className="bg-gray-50/50 rounded-xl border border-gray-100 flex-1 overflow-y-auto max-h-75 p-2">
                        {selectedDeductions.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                             <Shield className="w-8 h-8 mb-2 opacity-20"/>
                             <p className="text-sm">No deductions added yet.</p>
                           </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedDeductions.map((id) => {
                              const d = availableDeductions.find((x) => x.id === id);
                              if (!d) return null;
                              return (
                                <div key={id} className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{d.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                          d.type === "percentage"
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-green-50 text-green-700 border-green-100"
                                        }`}>
                                        {d.type === "percentage" ? "%" : "$"}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                         {d.type === "percentage" ? `${d.amount}%` : `$${d.amount}`}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelection("deduction", id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Remove"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance & Leave Tab */}
            {activeTab === "attendance" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600 shrink-0">
                    <CalendarClock className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-orange-900">Leave Management</h3>
                    <p className="text-sm text-orange-800 mt-1">
                      You can assign a primary Leave Type now. This acts as a default allocation template. You can customize allocations later.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Leave Type</label>
                    <div className="relative">
                      <select
                        name="leave_type_id"
                        value={leaveForm.leave_type_id}
                        onChange={handleLeaveInput}
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                      >
                        <option value="">No leave type assigned</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt.id} value={lt.id}>
                            {lt.name} {lt.is_paid ? "(Paid)" : "(Unpaid)"}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                     {leaveTypesLoading && <p className="mt-1.5 text-xs text-gray-500 animate-pulse">Loading available leave types...</p>}
                    {leaveForm.leave_type_id ? (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                         <strong>Auto-Allocation:</strong> Will allocate <span className="font-mono font-medium text-gray-900">{getDefaultDaysForLeaveType(leaveForm.leave_type_id)} days</span> for the current year.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Work Schedule Tab */}
            {activeTab === "work-schedule" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Work Schedule Assignment</h2>
                    <p className="text-sm text-gray-500">Define working hours and days for this employee.</p>
                  </div>
                  <Link href="/settings/work-schedules" target="_blank" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline">
                    Manage Schedules <ArrowLeft className="w-3 h-3 rotate-180"/>
                  </Link>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Schedule</label>
                      <div className="relative">
                        <select
                           className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                          value={selectedScheduleId}
                          onChange={(e) => setSelectedScheduleId(e.target.value)}
                          disabled={schedulesLoading}
                        >
                          <option value="">No schedule assigned</option>
                          {schedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} • {s.hours_per_day}h/day
                            </option>
                          ))}
                        </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      {schedulesError && <p className="text-xs text-red-600 mt-1">{schedulesError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Effective From</label>
                      <input
                        type="date"
                         className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                        value={scheduleEffectiveFrom}
                        onChange={(e) => setScheduleEffectiveFrom(e.target.value)}
                        disabled={!selectedScheduleId}
                      />
                       <p className="mt-1.5 text-xs text-gray-500">Start date for this schedule assignment.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center gap-4 pt-6 mt-6 border-t border-gray-100">
              <Link
                href="/employees"
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium text-sm shadow-sm"
              >
                Cancel
              </Link>
              <div className="flex-1"></div>
               {/* Optional: Add "Previous/Next" buttons logic here instead of just big Create button */}
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {loading ? (
                    <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                    </>
                ) : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </HRMSSidebar>
  );
}
