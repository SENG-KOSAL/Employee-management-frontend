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
  ChevronDown,
  MoreHorizontal,
  Calendar,
  Wallet,
  Users,
  Receipt,
  Landmark,
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
  total_gross_pay?: string | number;
  total_deductions?: string | number;
  total_taxes?: string | number;
}

const statusBadge = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "draft":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "approved":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "paid":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
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

  // UI state
  const [success, setSuccess] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
    
    // Sums
    const payrolls = filteredRuns.reduce((sum, r) => sum + Number(r.payrolls_count || 0), 0);
    const totalNetPay = filteredRuns.reduce((sum, r) => sum + Number(r.total_net_pay || 0), 0);
    const totalGrossPay = filteredRuns.reduce((sum, r) => sum + Number(r.total_gross_pay || (Number(r.total_net_pay || 0) * 1.25)), 0); // fallback mock if not available
    const totalDeductions = filteredRuns.reduce((sum, r) => sum + Number(r.total_deductions || (Number(r.total_net_pay || 0) * 0.1)), 0);
    const totalTaxes = filteredRuns.reduce((sum, r) => sum + Number(r.total_taxes || (Number(r.total_net_pay || 0) * 0.15)), 0);

    const latest = [...filteredRuns]
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.period_end || 0).getTime();
        const bTime = new Date(b.created_at || b.period_end || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 1)[0];

    return { total, draft, approved, paid, payrolls, totalNetPay, totalGrossPay, totalDeductions, totalTaxes, latest };
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
      setSuccess("Payroll run approved successfully");
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
      setSuccess("Payroll run marked as paid");
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
      setSuccess("Payroll data imported successfully");
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
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <p className="text-xs uppercase text-blue-600 font-bold tracking-wider">Payroll Status Center</p>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatMonthLabel(monthInput)}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium">
                  <div className={`w-2 h-2 rounded-full ${filteredRuns.length > 0 && filteredRuns.every(r => (r.status || "").toLowerCase() === 'paid') ? "bg-green-500" : "bg-amber-400"}`}></div>
                  {filteredRuns.length > 0 && filteredRuns.every(r => (r.status || "").toLowerCase() === 'paid') ? "All Paid" : "Mixed / Pending"}
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-blue-600" /> Payroll Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Strategic overview and fast financial actions.</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={handleImportFile}
              />

              <button
                onClick={() => router.push("/payroll/create")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Create Payroll
              </button>

              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

              <button
                onClick={() => fetchRuns()}
                className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors tooltip-trigger"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push("/payslips")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
              >
                <Receipt className="w-4 h-4" /> Payslips
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" /> More
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => { setMoreMenuOpen(false); router.push("/payroll"); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4 text-gray-400" /> View All Runs
                    </button>
                    <button
                      onClick={() => { setMoreMenuOpen(false); exportReportCsv(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4 text-gray-400" /> Report CSV
                    </button>
                    <button
                      onClick={() => { setMoreMenuOpen(false); exportRunsCsv(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4 text-gray-400" /> Export Runs
                    </button>
                    <button
                      onClick={() => { setMoreMenuOpen(false); handleImportClick(); }}
                      disabled={importing}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <FileUp className="w-4 h-4 text-gray-400" /> {importing ? "Importing..." : "Import Runs"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(error || success) && (
            <div className={`p-4 border rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              {error ? null : <CheckCircle className="w-5 h-5 text-emerald-500" />}
              {error || success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-6 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Employee Headcount Trend
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Last 20 Payroll Runs (All Time Context)</p>
                </div>
              </div>
              <div className="h-80 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 mt-4 transition-opacity duration-500">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Loading trend data...</div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="employees" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEmployees)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 transition-all hover:shadow-lg">
              <div className="mb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-purple-600" /> Run Status
                </h3>
                <p className="text-xs text-gray-500 font-medium">Distribution of last 20 runs</p>
              </div>
              <div className="h-80 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 mt-4 transition-opacity duration-500">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Loading...</div>
                ) : statusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl shadow-inner border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Payroll Period Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Selected Month</label>
                <input
                  type="month"
                  value={monthInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMonthInput(next);
                    fetchRuns({ month: next, status: statusFilter });
                  }}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft (Pending)</option>
                  <option value="approved">Approved (Ready)</option>
                  <option value="paid">Paid (Completed)</option>
                </select>
              </div>
              <div className="flex flex-col justify-end text-sm text-gray-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-semibold">Latest Available Run:</span>
                  <span className="font-bold text-slate-800">{formatMonthLabel(stats.latest?.period_start)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-semibold">Results Found:</span>
                  <span className="font-bold text-slate-800">{loading ? "..." : `${filteredRuns.length} runs`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Gross Payroll</p>
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">${stats.totalGrossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Selected Month</p>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Net Payroll</p>
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">${stats.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Actual Pay</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Taxes</p>
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">${stats.totalTaxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Est. Withholding</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Deductions</p>
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">${stats.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">Benefits & Other</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-indigo-600"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Employees</p>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{stats.payrolls}</p>
              <p className="text-xs text-indigo-600 mt-2 font-medium flex items-center gap-1">Paid in period</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <p className="text-base font-bold text-gray-900">Recent Payroll Runs</p>
                <p className="text-xs text-gray-500 font-medium">Showing 5 most recent runs</p>
              </div>
              <button
                onClick={() => router.push("/payroll")}
                className="text-sm text-blue-600 hover:text-blue-800 font-bold transition-colors"
              >
                View all {"->"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Run</th>
                    <th className="px-5 py-4">Period</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Payrolls</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-500 font-medium">
                        Loading...
                      </td>
                    </tr>
                  ) : recentRuns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-500 font-medium">
                        No payroll runs found
                      </td>
                    </tr>
                  ) : (
                    recentRuns.map((run) => (
                      <tr key={run.id} className="hover:-translate-y-0.5 hover:shadow-sm transition-all relative z-0 hover:z-10 bg-white group">
                        <td className="px-5 py-4">
                          <div className="font-bold text-gray-900">#{run.id}</div>
                          <div className="text-xs text-gray-500 font-medium">{formatMonthLabel(run.period_start)}</div>
                        </td>
                        <td className="px-5 py-4 text-gray-700 font-medium">
                          <div className="text-xs">{run.period_start} &rarr; {run.period_end}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(run.status)}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-900 font-semibold">{run.payrolls_count ?? "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/payroll/${run.id}`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 font-medium transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => router.push(`/payroll/${run.id}/payslip/print-all`)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 font-medium transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print All
                            </button>

                            {(run.status || "").toLowerCase() === "draft" ? (
                              <button
                                onClick={() => approveRun(run.id)}
                                disabled={actionId === run.id && actionType === "approve"}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md inline-flex items-center gap-1.5 font-semibold disabled:opacity-60 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {actionId === run.id && actionType === "approve" ? "Approving..." : "Approve"}
                              </button>
                            ) : null}

                            {(run.status || "").toLowerCase() === "approved" ? (
                              <button
                                onClick={() => payRun(run.id)}
                                disabled={actionId === run.id && actionType === "pay"}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm hover:shadow-md inline-flex items-center gap-1.5 font-semibold disabled:opacity-60 transition-all"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
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
