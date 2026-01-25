"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, Search, Plus, Eye, FileText } from "lucide-react";

interface LeaveRequestRow {
  id: number;
  employee_id: number;
  leave_type_id?: number;
  start_date: string;
  end_date: string;
  days?: number;
  status: string;
  reason?: string;
  employee?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    department?: { name?: string } | string;
  };
  leave_type?: {
    name?: string;
    code?: string;
  };
  created_at?: string;
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

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typesMap, setTypesMap] = useState<Record<number, { name?: string; code?: string; default_days?: number; days_per_year?: number }>>({});

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchTypes();
    fetchRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await api.get("/api/v1/leave-types");
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const map: Record<number, any> = {};
      list.forEach((t: any) => { if (t?.id) map[t.id] = t; });
      setTypesMap(map);
    } catch (err) {
      console.error("Failed to load leave types", err);
    }
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ per_page: "50" });
      if (status) params.append("status", status);
      const res = await api.get(`/api/v1/leave-requests?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const name = `${r.employee?.full_name || ""} ${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
      const code = (r.employee?.employee_code || "").toLowerCase();
      const typeName = (r.leave_type?.name || r.leave_type?.code || "").toLowerCase();
      const matches = term ? name.includes(term) || code.includes(term) || typeName.includes(term) : true;
      return matches;
    });
  }, [rows, search]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-sm text-gray-500">Create and manage leave requests on behalf of employees.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchRows}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => router.push("/leave-requests/create")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee or leave type"
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
            <div className="text-sm text-gray-600">Leave requests</div>
            <div className="text-xs text-gray-500">Latest 50 records</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No leave requests</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.employee?.full_name || `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`}</div>
                        <div className="text-xs text-gray-500">{r.employee?.employee_code || ""}</div>
                        <div className="text-[11px] text-gray-400">{typeof r.employee?.department === "string" ? r.employee?.department : r.employee?.department?.name || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-semibold">{r.leave_type?.name || r.leave_type?.code || "-"}</div>
                        {r.leave_type_id && typesMap[r.leave_type_id]?.default_days !== undefined && (
                          <div className="text-[11px] text-gray-500">Annual allowance: {typesMap[r.leave_type_id].days_per_year ?? typesMap[r.leave_type_id].default_days} days</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.start_date} → {r.end_date}</td>
                      <td className="px-4 py-3 text-gray-800">
                        {r.days ?? "-"}
                        {r.days === 0.5 && <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-[11px] font-semibold">Half day</span>}
                        {r.days && r.days > 0.5 && Number.isInteger(r.days) && <span className="ml-2 inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 text-[11px] font-semibold">Full days</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={r.reason || ""}>{r.reason || "-"}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Link
                          href={`/leave-requests/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        <Link
                          href={`/employees/${r.employee_id}/leave`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-blue-100 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <FileText className="w-4 h-4" /> Leave detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>
        )}
      </div>
    </HRMSSidebar>
  );
}
