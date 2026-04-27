"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";
import { leaveRequestsService } from "@/services/leaveRequests";
import { leaveTypesService } from "@/services/leaveTypes";
import api from "@/services/api";
import { getMe, getToken, saveMe } from "@/utils/auth";
import { CalendarClock, Send, Loader2 } from "lucide-react";

interface LeaveType {
  id: number;
  name: string;
  is_paid?: boolean;
}

type MePayload = {
  employee?: {
    id?: number;
  } | null;
} | null;

export default function EmployeeLeaveRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<MePayload>(() => getMe<MePayload>() || null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadUser();
    loadLeaveTypes();
  }, [router]);

  const loadUser = async () => {
    try {
      const cached = getMe();
      if (cached) {
        setUser(cached);
        return;
      }
      const res = await api.get("/api/v1/me");
      const data = res.data?.data ?? res.data;
      setUser(data);
      saveMe(data);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const res = await leaveTypesService.list();
      const raw = res as unknown;
      const items =
        typeof raw === "object" && raw && "data" in raw
          ? ((raw as { data?: unknown }).data as unknown)
          : raw;

      const list =
        typeof items === "object" && items && "data" in items
          ? ((items as { data?: unknown }).data as unknown)
          : items;

      setLeaveTypes(Array.isArray(list) ? (list as LeaveType[]) : []);
    } catch (err) {
      console.error(err);
      setLeaveTypes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee?.id) {
      setError("Employee profile not found");
      return;
    }
    if (!leaveTypeId || !startDate || !endDate) {
      setError("Leave type, start date, and end date are required");
      return;
    }
    setError("");
    setSuccess("");
    try {
      setSubmitting(true);
      await leaveRequestsService.create({
        employee_id: Number(user.employee.id),
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
        status: "pending",
      });
      setSuccess("Leave request submitted");
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: unknown) {
      console.error(err);
      const message =
        typeof err === "object" && err && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message as string | undefined)
          : undefined;
      setError(message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployeeSidebar>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Leave</h1>
            <p className="text-gray-500 text-sm">Submit your leave request for approval.</p>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Provide context for your request"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Request
              </button>
              <p className="text-xs text-gray-500">Requests are submitted as pending for approval.</p>
            </div>
          </form>
        </div>
      </div>
    </EmployeeSidebar>
  );
}
