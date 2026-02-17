"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, Search, CheckCircle, DollarSign, Eye } from "lucide-react";

interface PayrollRun {
  id: number;
  period_start: string;
  period_end: string;
  status: "draft" | "approved" | "paid" | string;
  payrolls_count?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  approved_by?: number | null;
  paid_at?: string | null;
}

const formatMonthLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "approved":
      return "bg-blue-50 text-blue-700 border border-blue-100";
    case "paid":
      return "bg-green-50 text-green-700 border border-green-100";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-100";
  }
};

export default function PayrollPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [monthInput, setMonthInput] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "pay" | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchRuns();
  }, [user]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/v1/me");
      const data = res.data?.data ?? res.data;
      const role = String(data?.role || "").toLowerCase();
      const allowed = ["admin", "hr", "company_admin", "super_admin", "super-admin", "superadmin", "developer"].includes(role);
      if (!allowed) {
        router.push("/");
        return;
      }
      setUser(data);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const fetchRuns = async (opts?: { monthInput?: string; status?: string; search?: string }) => {
    try {
      setLoading(true);
      setError("");
      const monthValue = opts?.monthInput ?? monthInput;
      const statusValue = opts?.status ?? statusFilter;
      const params = new URLSearchParams();
      params.append("per_page", "50");
      if (monthValue) {
        const [yearStr, mStr] = monthValue.split("-");
        params.append("month", String(Number(mStr)));
        params.append("year", String(Number(yearStr)));
      }
      if (statusValue) params.append("status", statusValue);
      const res = await api.get(`/api/v1/payroll-runs?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRuns(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  const approveRun = async (id: number) => {
    try {
      setActionId(id);
      setActionType("approve");
      await api.post(`/api/v1/payroll-runs/${id}/approve`);
      fetchRuns();
    } catch (err) {
      console.error(err);
      setError("Failed to approve run");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const payRun = async (id: number) => {
    try {
      setActionId(id);
      setActionType("pay");
      await api.post(`/api/v1/payroll-runs/${id}/mark-paid`);
      fetchRuns();
    } catch (err) {
      console.error(err);
      setError("Failed to mark run as paid");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const filteredRuns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesSearch = term
        ? `${run.id}`.includes(term) || (run.notes || "").toLowerCase().includes(term)
        : true;
      return matchesSearch;
    });
  }, [runs, search]);

  const handleExport = () => {
    if (!filteredRuns.length) {
      setError("No payroll runs to export");
      return;
    }

    const headers = ["ID", "Period Start", "Period End", "Status", "Payrolls", "Notes", "Created At"];
    const safe = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = filteredRuns.map((r) =>
      [r.id, r.period_start, r.period_end, r.status, r.payrolls_count ?? "", r.notes ?? "", r.created_at ?? ""]
        .map(safe)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-runs-${monthInput || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/api/v1/payroll-runs/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchRuns();
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || "Failed to import payroll runs";
      setError(message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleReset = () => {
    const defaultMonth = new Date().toISOString().slice(0, 7);
    setMonthInput(defaultMonth);
    setStatusFilter("");
    setSearch("");
    fetchRuns({ monthInput: defaultMonth, status: "", search: "" });
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Payroll Runs</h1>
            <p className="text-sm text-gray-500">Create, approve, and pay monthly payroll runs.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Export CSV
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              onClick={() => fetchRuns()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => router.push("/payroll/create")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
            >
              Create / Generate Payroll
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-16 z-10">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-44">
              <label className="text-xs font-semibold text-gray-500 uppercase">Month</label>
              <input
                type="month"
                value={monthInput}
                onChange={(e) => setMonthInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-xs font-semibold text-gray-500 uppercase">Search (notes or id)</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. January or 7"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-black"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => fetchRuns()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">Payroll Runs</div>
            <div className="text-xs text-gray-500">Approve then mark paid to finalize.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payrolls</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filteredRuns.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No runs found</td></tr>
                ) : (
                  filteredRuns.map((run) => {
                    const isApproveLoading = actionId === run.id && actionType === "approve";
                    const isPayLoading = actionId === run.id && actionType === "pay";
                    return (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{formatMonthLabel(run.period_start)}</div>
                          <div className="text-xs text-gray-500">#{run.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(run.status)}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-semibold">{run.payrolls_count ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{run.notes || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{run.created_at ? new Date(run.created_at).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/payroll/${run.id}`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            {run.status === "draft" && (
                              <button
                                onClick={() => approveRun(run.id)}
                                disabled={isApproveLoading}
                                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
                              >
                                <CheckCircle className="w-4 h-4" /> {isApproveLoading ? "Approving..." : "Approve"}
                              </button>
                            )}
                            {run.status === "approved" && (
                              <button
                                onClick={() => payRun(run.id)}
                                disabled={isPayLoading}
                                className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-1"
                              >
                                <DollarSign className="w-4 h-4" /> {isPayLoading ? "Paying..." : "Mark Paid"}
                              </button>
                            )}
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

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>
        )}
      </div>
    </HRMSSidebar>
  );
}
