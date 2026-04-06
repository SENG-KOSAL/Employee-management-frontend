"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { leaveRequestsService } from "@/services/leaveRequests";
import { getToken } from "@/utils/auth";

interface LeaveRequestRow {
  id: number;
  status: string;
  start_date: string;
  end_date: string;
  employee_id?: number;
  days?: number;
  reason?: string;
  created_at?: string;
  employee?: {
    id?: number;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    department?: { name?: string } | string;
  };
  leave_type?: {
    name?: string;
  };
}

const badgeClass = (status: string) => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "approved") return "bg-green-50 text-green-700 border-green-200";
  if (normalized === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function ManagerLeaveApprovalPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [decisionId, setDecisionId] = useState<number | null>(null);
  const [decisionType, setDecisionType] = useState<"approve" | "reject" | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ per_page: "200" });
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/api/v1/leave-requests?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load leave approvals");
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const name = `${row.employee?.full_name || ""} ${row.employee?.first_name || ""} ${row.employee?.last_name || ""}`.toLowerCase();
      const code = String(row.employee?.employee_code || "").toLowerCase();
      const leaveType = String(row.leave_type?.name || "").toLowerCase();
      const statusMatches = statusFilter ? String(row.status || "").toLowerCase() === statusFilter : true;
      const termMatches = !term || name.includes(term) || code.includes(term) || leaveType.includes(term);
      return statusMatches && termMatches;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = filteredRows.filter((row) => String(row.status || "pending").toLowerCase() === "pending").length;
    const approved = filteredRows.filter((row) => String(row.status || "").toLowerCase() === "approved").length;
    const rejected = filteredRows.filter((row) => String(row.status || "").toLowerCase() === "rejected").length;
    return { total: filteredRows.length, pending, approved, rejected };
  }, [filteredRows]);

  const startDecision = (id: number, type: "approve" | "reject") => {
    setDecisionId(id);
    setDecisionType(type);
    setDecisionNote("");
  };

  const submitDecision = async () => {
    if (!decisionId || !decisionType) return;
    try {
      setError("");
      if (decisionType === "approve") {
        await leaveRequestsService.approve(decisionId, decisionNote.trim() || undefined);
      } else {
        await leaveRequestsService.reject(decisionId, decisionNote.trim() || undefined);
      }
      setRows((current) => current.map((row) => (
        row.id === decisionId ? { ...row, status: decisionType === "approve" ? "approved" : "rejected" } : row
      )));
      setDecisionId(null);
      setDecisionType(null);
      setDecisionNote("");
    } catch (err) {
      console.error(err);
      setError("Failed to submit decision");
    }
  };

  return (
    <HRMSSidebar>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-blue-600">Manager Workflow</p>
            <h1 className="text-2xl font-bold text-gray-900">Leave Approval Queue</h1>
            <p className="text-sm text-gray-500">Approve or reject pending leave requests with notes for audit context.</p>
          </div>
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs uppercase text-gray-500 font-semibold">In scope</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4">
            <p className="text-xs uppercase text-amber-700 font-semibold">Pending</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
            <p className="text-xs uppercase text-green-700 font-semibold">Approved</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4">
            <p className="text-xs uppercase text-red-700 font-semibold">Rejected</p>
            <p className="text-2xl font-bold text-red-800 mt-1">{stats.rejected}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, code, or leave type"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-black"
            />
          </div>
          <div>
            <div className="relative">
              <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-black"
              >
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Loading approvals...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No leave requests found in this queue.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const employeeName = `${row.employee?.full_name || ""} ${row.employee?.first_name || ""} ${row.employee?.last_name || ""}`.trim() || "Employee";
                    const isPending = String(row.status || "pending").toLowerCase() === "pending";

                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{employeeName}</div>
                          <div className="text-xs text-gray-500">{row.employee?.employee_code || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.leave_type?.name || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{row.start_date} → {row.end_date}</div>
                          <div className="text-xs text-gray-500">{row.days || "-"} day(s)</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${badgeClass(row.status)}`}>
                            <Clock3 className="w-3.5 h-3.5" /> {row.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[280px] truncate">{row.reason || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/employees/${row.employee?.id || row.employee_id || ""}/leave`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>
                            <button
                              onClick={() => startDecision(row.id, "approve")}
                              disabled={!isPending}
                              className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => startDecision(row.id, "reject")}
                              disabled={!isPending}
                              className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
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

      <div className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${decisionId ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setDecisionId(null)} />
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ${decisionId ? "translate-x-0" : "translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs uppercase font-semibold text-indigo-600">Manager Decision</p>
          <h3 className="text-lg font-bold text-gray-900">{decisionType === "approve" ? "Approve Leave" : "Reject Leave"}</h3>
          <p className="text-xs text-gray-500">Add optional notes for audit and employee visibility.</p>
        </div>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs uppercase font-semibold text-gray-500 mb-1">Decision notes</span>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={5}
              placeholder="Optional context for this leave decision"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={submitDecision}
              disabled={!decisionId}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold ${decisionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-rose-600 hover:bg-rose-700"} disabled:opacity-50`}
            >
              <Loader2 className="w-4 h-4" /> Confirm {decisionType === "approve" ? "Approval" : "Rejection"}
            </button>
            <button
              onClick={() => {
                setDecisionId(null);
                setDecisionType(null);
                setDecisionNote("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </HRMSSidebar>
  );
}
