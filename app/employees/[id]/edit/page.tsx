"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, User, Lock, Gift, Minus } from "lucide-react";

type TabType = "personal" | "account" | "benefits" | "deductions";

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
  { id: "benefits", label: "Benefits", icon: Gift },
  { id: "deductions", label: "Deductions", icon: Minus },
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

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (id) fetchEmployee(id);
  }, [id, router]);

  const fetchEmployee = async (empId: string | number) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/employees/${empId}`);
      const data = res.data.data || res.data;
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
        <button
          onClick={() => router.push(id ? `/employees/${id}` : "/employees")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

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
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Benefits</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.health_insurance}
                      onChange={(e) => handleCheckboxChange("health_insurance", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Health Insurance</p>
                      <p className="text-sm text-gray-500">Comprehensive health coverage</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.retirement_plan}
                      onChange={(e) => handleCheckboxChange("retirement_plan", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Retirement Plan</p>
                      <p className="text-sm text-gray-500">401(k) or pension plan</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.dental_coverage}
                      onChange={(e) => handleCheckboxChange("dental_coverage", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Dental Coverage</p>
                      <p className="text-sm text-gray-500">Dental care coverage</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.vision_coverage}
                      onChange={(e) => handleCheckboxChange("vision_coverage", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Vision Coverage</p>
                      <p className="text-sm text-gray-500">Eye care coverage</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "deductions" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Deductions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax Percentage (%)</label>
                    <input
                      type="number"
                      name="tax_percentage"
                      value={formData.tax_percentage}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Security Percentage (%)</label>
                    <input
                      type="number"
                      name="social_security_percentage"
                      value={formData.social_security_percentage}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Health Insurance Deduction ($)</label>
                    <input
                      type="number"
                      name="health_insurance_deduction"
                      value={formData.health_insurance_deduction}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(id ? `/employees/${id}` : "/employees")}
                className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
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
