"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { leaveRequestsService } from "@/services/leaveRequests";
import { getToken } from "@/utils/auth";
import { CalendarClock, CheckCircle2, XCircle, Filter, RefreshCw } from "lucide-react";

interface LeaveRequestRow {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
  status?: string;
  employee?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  } | null;
  leave_type?: {
    name?: string;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ManagerLeaveApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    checkRoleAndLoad();
  }, [router]);

  const checkRoleAndLoad = async () => {
    try {
      const meRes = await api.get("/api/v1/me");
      const me = meRes.data?.data ?? meRes.data;
      const role = String(me?.role || "").toLowerCase();
      const allowed = ["manager", "admin", "hr", "super_admin", "super-admin", "superadmin", "developer"].includes(role);
      if (!allowed) {
        router.push("/leave-requests");
        return;
      }
      loadRequests(statusFilter);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const loadRequests = async (status?: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await leaveRequestsService.list({ per_page: 100, status });
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load leave requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (id: number, nextStatus: "approved" | "rejected") => {
    try {
      setUpdatingId(id);
      setError("");
      // try explicit approve/reject endpoints, fallback to status update
      try {
        if (nextStatus === "approved") {
          await leaveRequestsService.approve(id);
        } else {
          await leaveRequestsService.reject(id);
        }
      } catch (err) {
        await leaveRequestsService.updateStatus(id, nextStatus);
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return value;
    }
  };

  const filtered = requests.filter((r) => (statusFilter ? (r.status || "pending") === statusFilter : true));

  return (
    <HRMSSidebar>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
            <p className="text-gray-500 text-sm">Review and approve leave requests for your team.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              className="bg-transparent outline-none text-sm text-black"
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value;
                setStatusFilter(next);
                loadRequests(next);
              }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setRefreshing(true); loadRequests(statusFilter).finally(() => setRefreshing(false)); }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Requests</h2>
            <span className="text-sm text-gray-500">{filtered.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Leave Type</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">No requests found</td>
                  </tr>
                ) : (
                  filtered.map((req) => {
                    const empName = `${req.employee?.first_name ?? ""} ${req.employee?.last_name ?? ""}`.trim() || `#${req.employee_id}`;
                    const status = (req.status || "pending").toLowerCase();
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-900 font-medium">
                          <div className="flex flex-col">
                            <span>{empName}</span>
                            {req.employee?.employee_code ? (
                              <span className="text-xs text-gray-500">{req.employee.employee_code}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{req.leave_type?.name || req.leave_type_id}</td>
                        <td className="px-5 py-3 text-gray-700">
                          {formatDate(req.start_date)} - {formatDate(req.end_date)}
                        </td>
                        <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{req.reason || "-"}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              status === "approved"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {STATUS_LABEL[status] || status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStatus(req.id, "approved")}
                                disabled={updatingId === req.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Approve
                              </button>
                              <button
                                onClick={() => handleStatus(req.id, "rejected")}
                                disabled={updatingId === req.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold border border-red-200 hover:bg-red-200/60 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No actions</span>
                          )}
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
    </HRMSSidebar>
  );
}
