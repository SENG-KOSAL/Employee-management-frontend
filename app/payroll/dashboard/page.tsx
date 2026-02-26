"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  BarChart3,
  FileDown,
  FileUp,
  Plus,
  Eye,
  CheckCircle,
  DollarSign,
  Printer,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import api from "@/services/api";

interface PayrollRun {
  id: number;
  period_start: string;
  period_end: string;
  status: "draft" | "approved" | "paid" | string;
  payrolls_count?: number;
  notes?: string | null;
  created_at?: string;
  total_net_pay?: string | number;
}

const statusBadge = (status: string) => {
  switch ((status || "").toLowerCase()) {
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

const formatMonthLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function PayrollDashboardPage() {
  const router = useRouter();
  const [monthInput, setMonthInput] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("");

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [trends, setTrends] = useState<PayrollRun[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "pay" | null>(null);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchRuns = async (opts?: { month?: string; status?: string }) => {
    try {
      setLoading(true);
      setError("");
      const monthValue = opts?.month ?? monthInput;
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
      setRuns(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch trend data independent of monthly filter (last 20 runs)
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setTrendLoading(true);
        const res = await api.get("/api/v1/payroll-runs?per_page=20"); 
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setTrends(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load trends", err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrends();
  }, []);

  const chartData = useMemo(() => {
    // Sort chronological
    const sorted = [...trends].sort((a, b) => 
      new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
    );
    return sorted.map(run => ({
      name: new Date(run.period_start).toLocaleDateString("en-US", { month: 'short', year: '2-digit' }),
      employees: run.payrolls_count || 0,
      runId: run.id,
      netPay: Number(run.total_net_pay || 0),
    }));
  }, [trends]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { Draft: 0, Approved: 0, Paid: 0 };
    trends.forEach(r => {
      const s = (r.status || "Draft").toLowerCase();
      if (s === "paid") counts.Paid++;
      else if (s === "approved") counts.Approved++;
      else counts.Draft++;
    });
    return [
      { name: "Draft", value: counts.Draft, color: "#f59e0b" }, // amber-500
      { name: "Approved", value: counts.Approved, color: "#3b82f6" }, // blue-500
      { name: "Paid", value: counts.Paid, color: "#22c55e" }, // green-500
    ].filter(d => d.value > 0);
  }, [trends]);

  const filteredRuns = useMemo(() => {
    const status = statusFilter.trim().toLowerCase();
    if (!status) return runs;
    return runs.filter((r) => (r.status || "").toLowerCase() === status);
  }, [runs, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRuns.length;
    const draft = filteredRuns.filter((r) => (r.status || "").toLowerCase() === "draft").length;
    const approved = filteredRuns.filter((r) => (r.status || "").toLowerCase() === "approved").length;
    const paid = filteredRuns.filter((r) => (r.status || "").toLowerCase() === "paid").length;
    const payrolls = filteredRuns.reduce((sum, r) => sum + Number(r.payrolls_count || 0), 0);

    const latest = [...filteredRuns]
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.period_end || 0).getTime();
        const bTime = new Date(b.created_at || b.period_end || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 1)[0];

    return { total, draft, approved, paid, payrolls, latest };
  }, [filteredRuns]);

  const recentRuns = useMemo(() => {
    return [...filteredRuns]
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.period_end || 0).getTime();
        const bTime = new Date(b.created_at || b.period_end || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [filteredRuns]);

  const approveRun = async (id: number) => {
    try {
      setActionId(id);
      setActionType("approve");
      await api.post(`/api/v1/payroll-runs/${id}/approve`);
      await fetchRuns();
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
      await fetchRuns();
    } catch (err) {
      console.error(err);
      setError("Failed to mark run as paid");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const safeCsv = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const exportRunsCsv = () => {
    if (!filteredRuns.length) {
      setError("No payroll runs to export");
      return;
    }

    const headers = ["ID", "Period Start", "Period End", "Status", "Payrolls", "Notes", "Created At"];
    const rows = filteredRuns.map((r) =>
      [r.id, r.period_start, r.period_end, r.status, r.payrolls_count ?? "", r.notes ?? "", r.created_at ?? ""]
        .map(safeCsv)
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

  const exportReportCsv = () => {
    const headers = [
      "Month",
      "Total Runs",
      "Draft Runs",
      "Approved Runs",
      "Paid Runs",
      "Total Payrolls",
      "Generated At",
    ];

    const now = new Date().toISOString();
    const row = [
      monthInput,
      stats.total,
      stats.draft,
      stats.approved,
      stats.paid,
      stats.payrolls,
      now,
    ]
      .map(safeCsv)
      .join(",");

    const csv = [headers.join(","), row].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${monthInput || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

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
    } catch (err: unknown) {
      console.error(err);
      type AxiosErrorLike = { response?: { data?: { message?: string } } };
      const message = (err as AxiosErrorLike | null)?.response?.data?.message;
      setError(message || "Failed to import payroll runs");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "hr", "company_admin", "super_admin", "developer"]}>
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-blue-600 font-semibold">Payroll</p>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> Payroll Dashboard
              </h1>
              <p className="text-sm text-gray-500">Quick overview and fast actions for payroll work.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={handleImportFile}
              />

              <button
                onClick={() => router.push("/payroll/create")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" /> Create Payroll
              </button>
              <button
                onClick={() => router.push("/payroll")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Eye className="w-4 h-4" /> View Runs
              </button>
              <button
                onClick={() => router.push("/payslips")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Eye className="w-4 h-4" /> Payslips
              </button>
              <button
                onClick={exportReportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Report CSV
              </button>
              <button
                onClick={exportRunsCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Export
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60"
              >
                <FileUp className="w-4 h-4" /> {importing ? "Importing..." : "Import"}
              </button>
              <button
                onClick={() => fetchRuns()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Employee Headcount Trend
                  </h3>
                  <p className="text-xs text-gray-500">Number of employees processed per run</p>
                </div>
              </div>
              <div className="h-72 w-full">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading trend data...</div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#6b7280", fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#6b7280", fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="employees" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEmployees)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-purple-600" /> Run Status
                </h3>
                <p className="text-xs text-gray-500">Distribution of recent runs</p>
              </div>
              <div className="h-72 w-full">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                ) : statusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Month</label>
                <input
                  type="month"
                  value={monthInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMonthInput(next);
                    fetchRuns({ month: next, status: statusFilter });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
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
              <div className="flex items-end justify-between text-xs text-gray-500">
                <div>
                  Latest month: <span className="font-semibold text-gray-700">{formatMonthLabel(stats.latest?.period_start)}</span>
                </div>
                <div>
                  {loading ? "Loading..." : `Showing ${filteredRuns.length} run(s)`}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-gray-500 font-semibold">Runs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">For selected month/status</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-amber-700 font-semibold">Draft</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.draft}</p>
              <p className="text-xs text-gray-500 mt-1">Needs review</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-blue-700 font-semibold">Approved</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.approved}</p>
              <p className="text-xs text-gray-500 mt-1">Ready to pay</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-green-700 font-semibold">Paid</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.paid}</p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs uppercase text-gray-500 font-semibold">Payrolls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.payrolls}</p>
              <p className="text-xs text-gray-500 mt-1">Line items generated</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Recent Payroll Runs</p>
                <p className="text-xs text-gray-500">Fast access to the latest work</p>
              </div>
              <button
                onClick={() => router.push("/payroll")}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Run</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payrolls</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : recentRuns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                        No payroll runs found
                      </td>
                    </tr>
                  ) : (
                    recentRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">#{run.id}</div>
                          <div className="text-xs text-gray-500">{formatMonthLabel(run.period_start)}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="text-xs">{run.period_start} → {run.period_end}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(run.status)}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{run.payrolls_count ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/payroll/${run.id}`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button
                              onClick={() => router.push(`/payroll/${run.id}/payslip/print-all`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                            >
                              <Printer className="w-4 h-4" /> Print All
                            </button>

                            {(run.status || "").toLowerCase() === "draft" ? (
                              <button
                                onClick={() => approveRun(run.id)}
                                disabled={actionId === run.id && actionType === "approve"}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow inline-flex items-center gap-1 disabled:opacity-60"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {actionId === run.id && actionType === "approve" ? "Approving..." : "Approve"}
                              </button>
                            ) : null}

                            {(run.status || "").toLowerCase() === "approved" ? (
                              <button
                                onClick={() => payRun(run.id)}
                                disabled={actionId === run.id && actionType === "pay"}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm hover:shadow inline-flex items-center gap-1 disabled:opacity-60"
                              >
                                <DollarSign className="w-4 h-4" />
                                {actionId === run.id && actionType === "pay" ? "Paying..." : "Mark Paid"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
