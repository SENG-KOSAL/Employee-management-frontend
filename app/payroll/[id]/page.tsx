"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, CheckCircle, DollarSign, ArrowLeft, AlertTriangle, User, Download, Printer } from "lucide-react";

type UserPayload = {
  role?: string | null;
};

type AdjustmentKind = "earning" | "deduction";

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
  adjustments?: Adjustment[];
  audit_logs?: AuditLog[];
}

interface Adjustment {
  id: number;
  kind?: AdjustmentKind;
  amount: number | string;
  note?: string | null;
  description?: string | null;
  created_at?: string | null;
}

interface AuditLog {
  id: number;
  message?: string;
  created_at?: string;
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

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string" &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const capitalize = (value?: string | null) => {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  const [user, setUser] = useState<UserPayload | null>(null);
  const [data, setData] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState<"approve" | "pay" | null>(null);
  const [search, setSearch] = useState("");
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [editPayrollId, setEditPayrollId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    base_pay: "",
    overtime_pay: "",
    benefits_total: "",
    deductions_total: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [adjustPayrollId, setAdjustPayrollId] = useState<number | null>(null);
  const [adjustForm, setAdjustForm] = useState<{ kind: AdjustmentKind; amount: string; description: string }>({
    kind: "earning",
    amount: "",
    description: "",
  });
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<number, Adjustment[]>>({});
  const [adjustmentsLoading, setAdjustmentsLoading] = useState<Record<number, boolean>>({});
  const [adjustmentErrors, setAdjustmentErrors] = useState<Record<number, string>>({});

  const adjustmentsAllowed = data?.status === "approved" || data?.status === "paid";

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
      const role = String(data?.role || "").toLowerCase();
      const allowed = ["admin", "hr", "company_admin", "super_admin", "super-admin", "superadmin", "developer"].includes(role);
      if (!allowed) {
        router.push("/");
        return;
      }
      setUser(data);
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, "Failed to load payroll run"));
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
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, "Failed to approve run"));
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
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, "Failed to mark run as paid"));
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

  const startEdit = (p: PayrollItem) => {
    setError("");
    setEditPayrollId(p.id);
    setAdjustPayrollId(null);
    setEditForm({
      base_pay: p.base_pay,
      overtime_pay: p.overtime_pay,
      benefits_total: p.benefits_total,
      deductions_total: p.deductions_total,
      notes: p.notes || "",
    });
  };

  const submitEdit = async () => {
    if (!editPayrollId) return;
    try {
      setSavingEdit(true);
      setError("");
      await api.patch(`/api/v1/payrolls/${editPayrollId}`, editForm);
      await fetchDetail();
      setEditPayrollId(null);
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, "Failed to update payroll line"));
    } finally {
      setSavingEdit(false);
    }
  };

  const loadAdjustments = async (payrollId: number) => {
    try {
      setAdjustmentsLoading((prev) => ({ ...prev, [payrollId]: true }));
      setAdjustmentErrors((prev) => ({ ...prev, [payrollId]: "" }));
      const res = await api.get(`/api/v1/payrolls/${payrollId}/adjustments`);
      const list = res.data?.data ?? res.data ?? [];
      setAdjustments((prev) => ({ ...prev, [payrollId]: Array.isArray(list) ? list : [] }));
    } catch (err: unknown) {
      console.error(err);
      setAdjustmentErrors((prev) => ({
        ...prev,
        [payrollId]: getApiErrorMessage(err, "Failed to load adjustments"),
      }));
    } finally {
      setAdjustmentsLoading((prev) => ({ ...prev, [payrollId]: false }));
    }
  };

  const startAdjust = async (p: PayrollItem) => {
    setError("");
    if (!adjustmentsAllowed) return;
    setAdjustPayrollId(p.id);
    setEditPayrollId(null);
    setAdjustForm({ kind: "earning", amount: "", description: "" });
    await loadAdjustments(p.id);
  };

  const submitAdjust = async () => {
    if (!adjustPayrollId) return;
    const parsedAmount = Number(adjustForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAdjustmentErrors((prev) => ({ ...prev, [adjustPayrollId]: "Amount must be greater than 0." }));
      return;
    }
    if (!adjustForm.description.trim()) {
      setAdjustmentErrors((prev) => ({ ...prev, [adjustPayrollId]: "Description is required." }));
      return;
    }
    try {
      setSavingAdjust(true);
      setError("");
      setAdjustmentErrors((prev) => ({ ...prev, [adjustPayrollId]: "" }));
      await api.post(`/api/v1/payrolls/${adjustPayrollId}/adjustments`, {
        kind: adjustForm.kind,
        amount: parsedAmount,
        description: adjustForm.description.trim(),
      });
      await loadAdjustments(adjustPayrollId);
      await fetchDetail();
      setAdjustForm({ kind: "earning", amount: "", description: "" });
    } catch (err: unknown) {
      console.error(err);
      setAdjustmentErrors((prev) => ({ ...prev, [adjustPayrollId]: getApiErrorMessage(err, "Failed to add adjustment") }));
    } finally {
      setSavingAdjust(false);
    }
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" /> {actionType === "approve" ? "Approving..." : "Approve Run"}
                </button>
              )}
              {data.status === "approved" && (
                <button
                  onClick={markPaid}
                  disabled={actionType === "pay"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-green-700 shadow-sm hover:shadow disabled:opacity-60"
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
                      <th className="px-4 py-3 text-right">Actions</th>
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(`/payroll/${runId}/payslip/${p.id}`)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                              >
                                View payslip
                              </button>
                              {data.status === "draft" && (
                                <button
                                  onClick={() => startEdit(p)}
                                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => startAdjust(p)}
                                disabled={!adjustmentsAllowed}
                                className={`text-xs px-3 py-1.5 rounded-lg border ${adjustmentsAllowed ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"}`}
                                title={adjustmentsAllowed ? "Add manual payroll adjustment" : "Adjustments are available after payroll is approved."}
                              >
                                Adjust
                              </button>
                            </div>
                            {(editPayrollId === p.id || adjustPayrollId === p.id) && (
                              <div className="mt-3 text-left bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                {editPayrollId === p.id && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-700">Edit payroll line (draft only)</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Base</span>
                                        <input
                                          value={editForm.base_pay}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, base_pay: e.target.value }))}
                                          className="rounded border border-gray-200 px-2 py-1"
                                          type="number"
                                          step="0.01"
                                        />
                                      </label>
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Overtime</span>
                                        <input
                                          value={editForm.overtime_pay}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, overtime_pay: e.target.value }))}
                                          className="rounded border border-gray-200 px-2 py-1"
                                          type="number"
                                          step="0.01"
                                        />
                                      </label>
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Benefits</span>
                                        <input
                                          value={editForm.benefits_total}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, benefits_total: e.target.value }))}
                                          className="rounded border border-gray-200 px-2 py-1"
                                          type="number"
                                          step="0.01"
                                        />
                                      </label>
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Deductions</span>
                                        <input
                                          value={editForm.deductions_total}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, deductions_total: e.target.value }))}
                                          className="rounded border border-gray-200 px-2 py-1"
                                          type="number"
                                          step="0.01"
                                        />
                                      </label>
                                    </div>
                                    <label className="flex flex-col gap-1 text-sm">
                                      <span className="text-xs text-gray-500">Notes</span>
                                      <textarea
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        className="rounded border border-gray-200 px-2 py-1"
                                        rows={2}
                                      />
                                    </label>
                                    <div className="flex items-center gap-2 text-xs">
                                      <button
                                        onClick={submitEdit}
                                        disabled={savingEdit}
                                        className="px-3 py-1.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-60"
                                      >
                                        {savingEdit ? "Saving..." : "Save changes"}
                                      </button>
                                      <button
                                        onClick={() => setEditPayrollId(null)}
                                        className="px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {adjustPayrollId === p.id && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-700">Add adjustment (approved/paid)</div>
                                    {!adjustmentsAllowed && (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                        Adjustments are available after payroll is approved.
                                      </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Type</span>
                                        <select
                                          value={adjustForm.kind}
                                          onChange={(e) => setAdjustForm((prev) => ({ ...prev, kind: e.target.value as AdjustmentKind }))}
                                          className="rounded border border-gray-200 px-2 py-1 bg-white"
                                          disabled={!adjustmentsAllowed || savingAdjust}
                                        >
                                          <option value="earning">Earning</option>
                                          <option value="deduction">Deduction</option>
                                        </select>
                                      </label>
                                      <label className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500">Amount</span>
                                        <input
                                          value={adjustForm.amount}
                                          onChange={(e) => setAdjustForm((prev) => ({ ...prev, amount: e.target.value }))}
                                          className="rounded border border-gray-200 px-2 py-1"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          disabled={!adjustmentsAllowed || savingAdjust}
                                        />
                                      </label>
                                    </div>
                                    <label className="flex flex-col gap-1 text-sm">
                                      <span className="text-xs text-gray-500">Description</span>
                                      <textarea
                                        value={adjustForm.description}
                                        onChange={(e) => setAdjustForm((prev) => ({ ...prev, description: e.target.value }))}
                                        className="rounded border border-gray-200 px-2 py-1"
                                        rows={2}
                                        disabled={!adjustmentsAllowed || savingAdjust}
                                      />
                                    </label>
                                    {adjustmentErrors[p.id] && (
                                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                        {adjustmentErrors[p.id]}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs">
                                      <button
                                        onClick={submitAdjust}
                                        disabled={savingAdjust || !adjustmentsAllowed}
                                        className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        {savingAdjust ? "Saving..." : "Save adjustment"}
                                      </button>
                                      <button
                                        onClick={() => setAdjustPayrollId(null)}
                                        className="px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <div className="text-xs text-gray-600">Adjustments on approved/paid lines are logged and totals are recalculated.</div>
                                    <div className="text-xs text-gray-800 space-y-1">
                                      <div className="font-semibold text-gray-900">Past adjustments</div>
                                      {adjustmentsLoading[p.id] ? (
                                        <p className="text-gray-500">Loading adjustments...</p>
                                      ) : (adjustments[p.id] || []).length === 0 ? (
                                        <p className="text-gray-500">No adjustments yet.</p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {(adjustments[p.id] || []).map((adj) => (
                                            <li key={adj.id} className="flex items-center justify-between">
                                              <div className="min-w-0">
                                                <div className="truncate text-gray-800">{adj.description || adj.note || "Adjustment"}</div>
                                                <div className={`text-[11px] ${adj.kind === "deduction" ? "text-red-600" : "text-emerald-600"}`}>
                                                  {capitalize(adj.kind || "earning")}
                                                </div>
                                              </div>
                                              <span className={`font-mono font-semibold ${adj.kind === "deduction" ? "text-red-600" : "text-emerald-600"}`}>
                                                {adj.kind === "deduction" ? "-" : "+"}{currency(Math.abs(Number(adj.amount || 0)))}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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
