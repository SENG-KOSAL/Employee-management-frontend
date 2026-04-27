"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { leaveRequestsService } from "@/services/leaveRequests";
import { getToken } from "@/utils/auth";
import { RefreshCw, Search, Plus, Eye, FileText, CheckCircle2, XCircle, ShieldCheck, AlertCircle, X, Calendar, ClipboardList, Loader2 } from "lucide-react";

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
  const lower = (status || "pending").toLowerCase();
  
  if (lower === "approved") {
    return (
      <span className="ui-status-live inline-flex items-center gap-1.5 px-2.5 py-1 shadow-inner rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Approved
      </span>
    );
  }
  
  if (lower === "rejected") {
    return (
      <span className="ui-status-live inline-flex items-center gap-1.5 px-2.5 py-1 shadow-inner rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Rejected
      </span>
    );
  }
  
  return (
    <span className="ui-status-live inline-flex items-center gap-1.5 px-2.5 py-1 shadow-inner rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
    </span>
  );
};

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [typesMap, setTypesMap] = useState<Record<number, { name?: string; code?: string; default_days?: number; days_per_year?: number }>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [bulkActioning, setBulkActioning] = useState<"approve" | "reject" | null>(null);

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
      const map: Record<number, { name?: string; code?: string; default_days?: number; days_per_year?: number }> = {};
      list.forEach((t: { id?: number; name?: string; code?: string; default_days?: number; days_per_year?: number }) => { 
        if (t?.id) map[t.id] = t; 
      });
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

  const handleStatus = async (id: number, nextStatus: "approved" | "rejected") => {
    try {
      setUpdatingId(id);
      setError("");
      try {
        if (nextStatus === "approved") {
          await leaveRequestsService.approve(id);
        } else {
          await leaveRequestsService.reject(id);
        }
      } catch {
        await leaveRequestsService.updateStatus(id, nextStatus);
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedIds.length === 0) return;

    try {
      setBulkActioning(action);
      setError("");
      const results = await Promise.allSettled(
        selectedIds.map(async (id) => {
          try {
            if (action === "approve") {
              await leaveRequestsService.approve(id);
            } else {
              await leaveRequestsService.reject(id);
            }
          } catch {
            await leaveRequestsService.updateStatus(id, action === "approve" ? "approved" : "rejected");
          }
          return id;
        })
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      const finalStatus = action === "approve" ? "approved" : "rejected";
      setRows((prev) => prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: finalStatus } : r)));
      
      if (failed > 0) {
        setError(`Processed ${succeeded}, failed ${failed}. Please retry failed items.`);
      } else {
        setSelectedIds([]);
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${action} requests`);
    } finally {
      setBulkActioning(null);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const name = `${r.employee?.full_name || ""} ${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
      const code = (r.employee?.employee_code || "").toLowerCase();
      const typeName = (r.leave_type?.name || r.leave_type?.code || "").toLowerCase();
      
      const matchesSearch = term ? name.includes(term) || code.includes(term) || typeName.includes(term) : true;
      const matchesStatus = status ? (r.status || "pending").toLowerCase() === status.toLowerCase() : true;
      let matchesDate = true;
      if (fromDate && r.start_date < fromDate) matchesDate = false;
      if (toDate && r.end_date > toDate) matchesDate = false;
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [rows, search, status, fromDate, toDate]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const pendingVisibleIds = useMemo(
    () => filtered.filter((r) => (r.status || "pending").toLowerCase() === "pending").map(r => r.id),
    [filtered]
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pendingVisibleIds);
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="relative bg-gradient-to-r from-blue-50/50 to-transparent p-6 rounded-2xl border border-blue-100/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative z-10">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-3 shadow-sm shadow-indigo-100/50">
               <ShieldCheck className="w-3 h-3 mr-1" /> Admin Only
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Leave Requests</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Create and manage leave requests on behalf of employees.</p>
          </div>
          <div className="flex gap-3 relative z-10">
            <button
              onClick={fetchRows}
              disabled={loading}
              className="ui-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200 font-semibold text-sm disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            {/* <Link
              href="/leave-requests/manager"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200 font-semibold text-sm"
              title="Approval page"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" /> <span className="hidden sm:inline">Apprkkovals</span>
            </Link> */}
            <button
              onClick={() => router.push("/leave-requests/create")}
              className="ui-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Something went wrong</p>
              <p>{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 transition-colors p-1" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="ui-card bg-slate-50/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">Filters</span>
             </div>
             <span className="text-xs text-gray-400 font-medium">Instantly applied</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Employee name, code, or type..."
                  className="w-full pl-9 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setSelectedIds([]);
                }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                 <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-md animate-in slide-in-from-bottom-2 gap-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-inner">
                   {selectedIds.length}
                </div>
                <span className="text-sm font-bold text-indigo-900">Requests Selected</span>
             </div>
             <div className="flex items-center gap-3">
                <button
                   onClick={() => setSelectedIds([])}
                   className="px-3 py-1.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                   Cancel
                </button>
                <button
                   onClick={() => handleBulkAction("reject")}
                   disabled={bulkActioning !== null}
                   className="ui-btn inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 text-sm font-bold rounded-xl hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                >
                   {bulkActioning === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} 
                   {bulkActioning === "reject" ? "Rejecting..." : "Reject All"}
                </button>
                <button
                   onClick={() => handleBulkAction("approve")}
                   disabled={bulkActioning !== null}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 border border-transparent text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                >
                   {bulkActioning === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
                   {bulkActioning === "approve" ? "Approving..." : "Approve All"}
                </button>
             </div>
          </div>
        )}

        <div className="ui-card bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <h3 className="font-bold text-gray-900 text-lg">Leave Requests Data</h3>
            <div className="text-xs text-slate-500 font-bold tracking-wide uppercase bg-slate-100 px-3 py-1 rounded-md">Latest 50 records</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                     <input
                        type="checkbox"
                        checked={selectedIds.length === pendingVisibleIds.length && pendingVisibleIds.length > 0}
                        onChange={handleSelectAll}
                        disabled={pendingVisibleIds.length === 0}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer w-4 h-4 shadow-sm"
                     />
                  </th>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Leave Type</th>
                  <th className="px-4 py-4">Dates</th>
                  <th className="px-4 py-4">Days</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 w-48">Reason</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                     <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                           <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                           <h4 className="text-gray-900 font-bold mb-1 text-base">Loading Requests</h4>
                           <p className="text-gray-500 text-sm">Please wait while we fetch the latest data...</p>
                        </div>
                     </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                     <td colSpan={8} className="px-4 py-16 text-center bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center">
                           <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                              <ClipboardList className="w-8 h-8 opacity-80" />
                           </div>
                           <h4 className="text-gray-900 font-bold mb-1 text-lg">No Leave Requests Found</h4>
                           <p className="text-gray-500 text-sm max-w-sm">We couldn&apos;t find any leave requests matching your current filters. Try adjusting your search or dates.</p>
                        </div>
                     </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const isPending = (r.status || "pending").toLowerCase() === "pending";
                    const empName = r.employee?.full_name || `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "-";
                    const empFirstChars = r.employee?.first_name?.charAt(0) || empName.charAt(0) || "E";
                    const empLastChars = r.employee?.last_name?.charAt(0) || ("");
                    const empInitials = `${empFirstChars}${empLastChars}`.toUpperCase();

                    return (
                    <tr key={r.id} className={`group ui-row-hover hover:bg-blue-50/40 transition-colors duration-150 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${selectedIds.includes(r.id) ? "ui-row-selected" : ""}`}>
                      <td className="px-4 py-4 text-center border-r border-transparent group-hover:border-blue-100/50 transition-colors">
                         {isPending ? (
                           <input
                              type="checkbox"
                              checked={selectedIds.includes(r.id)}
                              onChange={() => toggleSelect(r.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 shadow-sm"
                           />
                         ) : (
                           <span className="w-4 h-4 inline-block bg-gray-100 rounded border border-gray-200 opacity-50 cursor-not-allowed" title="Only pending requests can be selected" />
                         )}
                      </td>
                      <td className="px-4 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 border border-white">
                               {empInitials}
                            </div>
                            <div className="flex flex-col min-w-0">
                               <div className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">{empName}</div>
                               <div className="flex items-center gap-1.5 mt-0.5">
                                 <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm">{r.employee?.employee_code || "N/A"}</span>
                                 <span className="text-xs text-slate-400 truncate max-w-[120px] font-medium">{typeof r.employee?.department === "string" ? r.employee?.department : r.employee?.department?.name || "-"}</span>
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        <div className="font-semibold text-gray-900">{r.leave_type?.name || r.leave_type?.code || "-"}</div>
                        {r.leave_type_id && typesMap[r.leave_type_id]?.default_days !== undefined && (
                          <div className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5 font-medium">Allowance: <span className="text-gray-600">{typesMap[r.leave_type_id].days_per_year ?? typesMap[r.leave_type_id].default_days} days</span></div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                         <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {r.start_date}
                         </div>
                         <div className="text-xs text-slate-500 mt-0.5 ml-5 font-medium">to {r.end_date}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-800">
                        <span className="font-extrabold text-gray-900">{r.days ?? "-"}</span>
                        {r.days === 0.5 && <div className="mt-1 inline-flex items-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">Half day</div>}
                        {r.days && r.days > 0.5 && Number.isInteger(r.days) && <div className="mt-1 inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">Full days</div>}
                      </td>
                      <td className="px-4 py-4">
                        {statusBadge(r.status)}
                      </td>
                      <td className="px-4 py-4">
                         <div className="text-sm text-gray-600 line-clamp-2 text-ellipsis leading-relaxed font-medium" title={r.reason || ""}>
                            {r.reason || <span className="text-gray-400 italic">No reason provided</span>}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStatus(r.id, "approved")}
                                  disabled={updatingId === r.id || selectedIds.length > 0}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 transition-all shadow-sm hover:shadow"
                                  title="Approve immediately"
                                >
                                  {updatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatus(r.id, "rejected")}
                                  disabled={updatingId === r.id || selectedIds.length > 0}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 transition-all shadow-sm hover:shadow"
                                  title="Reject immediately"
                                >
                                  {updatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                </button>
                                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                              </>
                            )}
                            <Link
                              href={`/leave-requests/${r.id}`}
                              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                              title="View full details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/employees/${r.employee_id}/leave`}
                              className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="View employee leave history"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>
                         </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HRMSSidebar>
  );
}
