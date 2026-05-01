"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { ArrowLeft, CalendarRange, Clock, Search, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface LeaveRequestRow {
  id: number;
  employee_id: number;
  leave_type_id?: number;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
  created_at?: string;
  leave_type?: {
    name?: string;
    code?: string;
  };
}

interface EmployeeDetail {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  department?: { name?: string } | string;
  job_title?: string;
  email?: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-50 text-green-700 border border-green-100";
    case "rejected":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
};

export default function EmployeeLeavePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id ? Number(params.id) : null;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!employeeId) return;
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchData = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setError("");
      const [empRes, leaveRes] = await Promise.all([
        api.get(`/api/v1/employees/${employeeId}`),
        api.get(`/api/v1/leave-requests?employee_id=${employeeId}&per_page=200`),
      ]);
      const empData = empRes.data?.data ?? empRes.data;
      setEmployee(empData);
      const leaveData = leaveRes.data?.data ?? leaveRes.data;
      const list = Array.isArray(leaveData) ? leaveData : leaveData?.data ?? [];
      setRows(list);
    } catch (err) {
      console.error("Failed to load employee leave", err);
      setError("Failed to load employee leave details");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const typeName = (r.leave_type?.name || r.leave_type?.code || "").toLowerCase();
      const matchesTerm = term ? typeName.includes(term) || (r.reason || "").toLowerCase().includes(term) : true;
      const matchesStatus = status ? r.status === status : true;
      return matchesTerm && matchesStatus;
    });
  }, [rows, search, status]);

  const stats = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const upcoming = rows.filter((r) => new Date(r.start_date) >= new Date()).length;
    return { total, approved, pending, rejected, upcoming };
  }, [rows]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <p className="text-xs uppercase text-blue-600 font-semibold">Employee Leave</p>
              <h1 className="text-2xl font-bold text-gray-900">{employee?.full_name || `${employee?.first_name || ""} ${employee?.last_name || ""}` || "Employee"}</h1>
              <p className="text-sm text-gray-500">Leave history and status for this employee.</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {employee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-gray-500 font-semibold">Employee</p>
              <p className="text-lg font-semibold text-gray-900">{employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`}</p>
              <p className="text-sm text-gray-500">{employee.employee_code || ""}</p>
              <p className="text-xs text-gray-500">{typeof employee.department === "string" ? employee.department : employee.department?.name || ""}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-gray-800">
                <CalendarRange className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Upcoming</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.upcoming}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-800">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Pending</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-2">
              <p className="text-xs uppercase text-gray-500 font-semibold">Summary</p>
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Approved: {stats.approved}
              </div>
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <Clock className="w-4 h-4" /> Pending: {stats.pending}
              </div>
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="w-4 h-4" /> Rejected: {stats.rejected}
              </div>
              <div className="text-sm text-gray-700 font-semibold">Total requests: {stats.total}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by leave type or reason"
                className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center justify-end text-xs text-gray-500">Filters apply instantly.</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">Leave requests for this employee</div>
            <div className="text-xs text-gray-500">Latest up to 200 records</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No leave records</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 font-semibold">{r.leave_type?.name || r.leave_type?.code || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{r.start_date} → {r.end_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={r.reason || ""}>{r.reason || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>
    </HRMSSidebar>
  );
}
