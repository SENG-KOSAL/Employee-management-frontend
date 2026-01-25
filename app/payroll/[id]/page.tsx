"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, CheckCircle, DollarSign, ArrowLeft, AlertTriangle, User, Download, Printer } from "lucide-react";

interface PayrollItem {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    employee_code?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  period_start: string;
  period_end: string;
  base_pay: string;
  overtime_pay: string;
  benefits_total: string;
  deductions_total: string;
  unpaid_leave_deduction: string;
  gross_pay: string;
  net_pay: string;
  status: string;
  paid_at?: string | null;
  notes?: string | null;
}

interface PayrollRunDetail {
  id: number;
  period_start: string;
  period_end: string;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  approved_by?: number | null;
  paid_at?: string | null;
  payrolls: PayrollItem[];
}

const currency = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value || "0") : value || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
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

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState<"approve" | "pay" | null>(null);
  const [search, setSearch] = useState("");
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);

  const issueFlags = (p: PayrollItem) => {
    const flags: string[] = [];
    if (!p.employee?.full_name && !(p.employee?.first_name || p.employee?.last_name)) flags.push("Missing employee name");
    if (!p.employee?.employee_code) flags.push("Missing employee code");
    if (Number(p.net_pay) <= 0) flags.push("Non-positive net pay");
    if (Number(p.gross_pay) <= 0) flags.push("Non-positive gross pay");
    if (!p.status || p.status === "draft") flags.push("Line not approved");
    return flags;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (!user || !runId) return;
    fetchDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, runId]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/v1/me");
      const data = res.data?.data ?? res.data;
      if (data?.role !== "admin" && data?.role !== "hr") {
        router.push("/");
        return;
      }
      setUser(data);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/payroll-runs/${runId}`);
      const detail = res.data?.data ?? res.data;
      setData(detail);
    } catch (err) {
      console.error(err);
      setError("Failed to load payroll run");
    } finally {
      setLoading(false);
    }
  };

  const approveRun = async () => {
    if (!runId) return;
    try {
      setActionType("approve");
      await api.post(`/api/v1/payroll-runs/${runId}/approve`);
      fetchDetail();
    } catch (err) {
      console.error(err);
      setError("Failed to approve run");
    } finally {
      setActionType(null);
    }
  };

  const markPaid = async () => {
    if (!runId) return;
    try {
      setActionType("pay");
      await api.post(`/api/v1/payroll-runs/${runId}/mark-paid`);
      fetchDetail();
    } catch (err) {
      console.error(err);
      setError("Failed to mark run as paid");
    } finally {
      setActionType(null);
    }
  };

  const filteredPayrolls = useMemo(() => {
    if (!data?.payrolls) return [];
    const term = search.trim().toLowerCase();
    const shouldFilterIssues = showIssuesOnly;
    const items = data.payrolls.filter((p) => {
      const name = `${p.employee?.full_name || ""} ${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.toLowerCase();
      const code = (p.employee?.employee_code || "").toLowerCase();
      const matches = term ? name.includes(term) || code.includes(term) : true;
      const hasIssues = issueFlags(p).length > 0;
      return matches && (!shouldFilterIssues || hasIssues);
    });
    return items;
  }, [data?.payrolls, search, showIssuesOnly]);

  const handleExport = () => {
    if (!data?.payrolls || data.payrolls.length === 0) {
      setError("No payrolls to export");
      return;
    }

    const items = filteredPayrolls.length ? filteredPayrolls : data.payrolls;
    const headers = [
      "Employee Code",
      "Employee Name",
      "Period Start",
      "Period End",
      "Base Pay",
      "Overtime",
      "Benefits",
      "Deductions",
      "Gross",
      "Net",
      "Status",
      "Notes",
    ];
    const safe = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = items.map((p) => {
      const name = p.employee?.full_name || `${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.trim();
      return [
        p.employee?.employee_code || "",
        name,
        p.period_start,
        p.period_end,
        p.base_pay,
        p.overtime_pay,
        p.benefits_total,
        p.deductions_total,
        p.gross_pay,
        p.net_pay,
        p.status,
        p.notes || "",
      ]
        .map(safe)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-run-${runId || "detail"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    if (!data?.payrolls) return { headcount: 0, gross: 0, net: 0 };
    return data.payrolls.reduce(
      (acc, p) => {
        acc.headcount += 1;
        acc.gross += Number(p.gross_pay || 0);
        acc.net += Number(p.net_pay || 0);
        return acc;
      },
      { headcount: 0, gross: 0, net: 0 }
    );
  }, [data?.payrolls]);

  const statusCounts = useMemo(() => {
    if (!data?.payrolls) return {} as Record<string, number>;
    return data.payrolls.reduce((acc: Record<string, number>, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
  }, [data?.payrolls]);

  const handlePrintAllPayslips = () => {
    router.push(`/payroll/${runId}/payslip/print-all?auto=1`);
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Payroll Run #{runId}</h1>
            <p className="text-sm text-gray-500">Details and employee line items.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/payroll")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handlePrintAllPayslips}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print all
            </button>
            <button
              onClick={fetchDetail}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}

        {loading || !data ? (
          <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <p className="text-xs text-gray-500">Period</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {new Date(data.period_start).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-400">{data.period_start} - {data.period_end}</p>
              </div>
              <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border" aria-label="run status">
                  <span className={statusBadge(data.status)}>{data.status}</span>
                </div>
                <p className="text-xs text-gray-400">Approved by: {data.approved_by ?? "-"}</p>
              </div>
              <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900 mt-1">{data.created_at ? new Date(data.created_at).toLocaleString() : "-"}</p>
                <p className="text-xs text-gray-400">Paid at: {data.paid_at ? new Date(data.paid_at).toLocaleString() : "-"}</p>
              </div>
              <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-800 mt-1">{data.notes || "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 uppercase font-semibold">Headcount</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{totals.headcount}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-700 uppercase font-semibold">Total Gross</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{currency(totals.gross)}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-xs text-green-700 uppercase font-semibold">Total Net</p>
                <p className="text-xl font-bold text-green-900 mt-1">{currency(totals.net)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.status === "draft" && (
                <button
                  onClick={approveRun}
                  disabled={actionType === "approve"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" /> {actionType === "approve" ? "Approving..." : "Approve Run"}
                </button>
              )}
              {data.status === "approved" && (
                <button
                  onClick={markPaid}
                  disabled={actionType === "pay"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                >
                  <DollarSign className="w-4 h-4" /> {actionType === "pay" ? "Marking..." : "Mark as Paid"}
                </button>
              )}
              <div className="text-xs text-gray-500">Refreshing after actions updates employee lines.</div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Review checklist
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  {Object.entries(statusCounts).map(([s, count]) => (
                    <span key={s} className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold border ${statusBadge(s)}`}>
                      {s}: {count}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900">What to check</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 mt-1">
                    <li>Employees missing code or name.</li>
                    <li>Lines with zero or negative gross/net.</li>
                    <li>Lines still in draft/unapproved status.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Quick filters</p>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showIssuesOnly}
                        onChange={(e) => setShowIssuesOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Show only rows with issues
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">Employee Payrolls</div>
                <div className="flex items-center gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or code"
                    className="text-sm rounded-lg border border-gray-200 px-3 py-1.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="text-xs text-gray-500">Net pay and breakdown per employee.</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Base</th>
                      <th className="px-4 py-3">Overtime</th>
                      <th className="px-4 py-3">Benefits</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Net</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayrolls.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No payrolls in this run</td></tr>
                    ) : (
                      filteredPayrolls.map((p) => (
                        <tr key={p.id} className={`hover:bg-gray-50 ${issueFlags(p).length ? "bg-amber-50/40" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{p.employee?.full_name || `${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`}</div>
                            <div className="text-xs text-gray-500">{p.employee?.employee_code || ""}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-700">{currency(p.base_pay)}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{currency(p.overtime_pay)}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{currency(p.benefits_total)}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{currency(p.deductions_total)}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{currency(p.gross_pay)}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{currency(p.net_pay)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadge(p.status)}`}>
                                {p.status || "draft"}
                              </span>
                              {issueFlags(p).length > 0 && (
                                <span className="inline-flex items-center gap-1 text-amber-700 text-[11px]">
                                  <AlertTriangle className="w-3 h-3" /> {issueFlags(p)[0]}
                                </span>
                              )}
                              <button
                                onClick={() => router.push(`/employees/${p.employee_id}`)}
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                title="Open employee profile"
                              >
                                <User className="w-3 h-3" /> View employee
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => router.push(`/payroll/${runId}/payslip/${p.id}`)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              View payslip
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </HRMSSidebar>
  );
}
