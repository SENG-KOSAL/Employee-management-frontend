"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { leaveRequestsService } from "@/services/leaveRequests";
import { leaveTypesService } from "@/services/leaveTypes";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { Users, CalendarClock, Loader2, Send } from "lucide-react";

interface LeaveType {
  id: number;
  name: string;
  is_paid?: boolean;
}

interface EmployeeOption {
  id: number;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
}

export default function AdminLeaveAssignPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("approved");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    checkRole();
    loadLeaveTypes();
    loadEmployees();
  }, [router]);

  const checkRole = async () => {
    try {
      const res = await api.get("/api/v1/me");
      const me = res.data?.data ?? res.data;
      const role = String(me?.role || "").toLowerCase();
      const allowed = ["admin", "hr", "super_admin", "super-admin", "superadmin", "developer"].includes(role);
      if (!allowed) {
        router.push("/leave-requests");
      }
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const res = await leaveTypesService.list();
      const items = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setLeaveTypes(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      setLeaveTypes([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/api/v1/employees?per_page=300");
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const normalized = list.map((e: any) => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        employee_code: e.employee_code,
      }));
      setEmployees(normalized);
    } catch (err) {
      console.error(err);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      setError("Employee, leave type, start date, and end date are required");
      return;
    }
    setError("");
    setSuccess("");
    try {
      setSubmitting(true);
      await leaveRequestsService.create({
        employee_id: Number(employeeId),
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
        status,
      });
      setSuccess("Leave assigned successfully");
      setEmployeeId("");
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HRMSSidebar>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assign Leave</h1>
            <p className="text-gray-500 text-sm">Submit leave on behalf of employees.</p>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.employee_code ? `• ${emp.employee_code}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} {lt.is_paid ? "(Paid)" : "(Unpaid)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
                placeholder="Provide context for this leave"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
              >
                <option value="approved">Approve on submit</option>
                <option value="pending">Submit as pending</option>
                <option value="rejected">Submit as rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit
              </button>
              <p className="text-xs text-gray-500">Submit leave for any employee.</p>
            </div>
          </form>
        </div>
      </div>
    </HRMSSidebar>
  );
}
