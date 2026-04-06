"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, Eye, Download, X, Building2, CalendarRange, User } from "lucide-react";

interface PayslipRow {
  id: number;
  payroll_run_id?: number;
  period_start: string;
  period_end: string;
  status: string;
  net_pay: string;
  gross_pay: string;
  created_at?: string;
  employee?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    department?: { name?: string };
  };
}

const currency = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value || "0") : value || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const formatMonthLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function PayslipsPage() {
  const router = useRouter();
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [previewRow, setPreviewRow] = useState<PayslipRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchPayslips();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/payrolls?per_page=50");
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setPayslips(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    payslips.forEach((p) => {
      const name = p.employee?.department?.name;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [payslips]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const nameTerm = nameFilter.trim().toLowerCase();
    const deptTerm = deptFilter.trim().toLowerCase();
    return payslips.filter((p) => {
      const month = formatMonthLabel(p.period_start).toLowerCase();
      const matchesSearch = term ? month.includes(term) || `${p.id}`.includes(term) || `${p.payroll_run_id ?? ""}`.includes(term) : true;
      const fullName = `${p.employee?.full_name || ""} ${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.toLowerCase();
      const code = (p.employee?.employee_code || "").toLowerCase();
      const matchesName = nameTerm ? fullName.includes(nameTerm) || code.includes(nameTerm) : true;
      const deptName = (p.employee?.department?.name || "").toLowerCase();
      const matchesDept = deptTerm ? deptName === deptTerm : true;
      return matchesSearch && matchesName && matchesDept;
    });
  }, [payslips, search, nameFilter, deptFilter]);

  const openPayslip = (row: PayslipRow) => {
    if (row.payroll_run_id) {
      router.push(`/payroll/${row.payroll_run_id}/payslip/${row.id}`);
    } else {
      router.push(`/payroll/${row.id}`);
    }
  };

  const downloadPayslip = (row: PayslipRow) => {
    openPayslip(row);
    // For now rely on the Print/PDF inside the payslip view. You can wire a direct PDF endpoint here if backend provides it.
  };

  const stats = useMemo(() => {
    const paid = filtered.filter((row) => String(row.status || "").toLowerCase() === "paid").length;
    const approved = filtered.filter((row) => String(row.status || "").toLowerCase() === "approved").length;
    const draft = Math.max(0, filtered.length - paid - approved);
    return { total: filtered.length, paid, approved, draft };
  }, [filtered]);

  const openPreview = (row: PayslipRow) => {
    setPreviewRow(row);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setTimeout(() => setPreviewRow(null), 180);
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">My Payslips</p>
            <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
            <p className="text-sm text-gray-500">View or download your monthly payslips.</p>
          </div>
          <button
            onClick={fetchPayslips}
            className="ui-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="ui-card bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by month or ID"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Filter by employee name/code"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end text-xs text-gray-500">Tip: use the payslip page to print/download as PDF.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase text-slate-500 font-semibold">Payslips in scope</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase text-emerald-700 font-semibold">Paid</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{stats.paid}</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase text-blue-700 font-semibold">Approved</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white border border-amber-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase text-amber-700 font-semibold">Draft / pending</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{stats.draft}</p>
          </div>
        </div>

        <div className="ui-card bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">Payslip history</div>
            <div className="text-xs text-gray-500">Latest 50 records</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Net Pay</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="ui-skeleton h-9 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payslips found</td></tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="ui-row-hover hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{`${row.employee?.full_name || ""} ${row.employee?.first_name || ""} ${row.employee?.last_name || ""}`.trim() || "Employee"}</div>
                        <div className="text-xs text-gray-500">{row.employee?.employee_code || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{formatMonthLabel(row.period_start)}</div>
                        <div className="text-xs text-gray-500">#{row.id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 capitalize">
                        <span className={`ui-status-live inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                          String(row.status || "").toLowerCase() === "paid"
                            ? "border-green-100 bg-green-50 text-green-700"
                            : String(row.status || "").toLowerCase() === "approved"
                              ? "border-blue-100 bg-blue-50 text-blue-700"
                              : "border-amber-100 bg-amber-50 text-amber-700"
                        }`}>
                          {row.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{currency(row.net_pay)}</td>
                      <td className="px-4 py-3 text-gray-700">{currency(row.gross_pay)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openPreview(row)}
                            className="ui-btn px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" /> Preview
                          </button>
                          <button
                            onClick={() => downloadPayslip(row)}
                            className="ui-btn px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow inline-flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" /> PDF
                          </button>
                        </div>
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

      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${previewOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closePreview}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ${previewOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!previewOpen}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-indigo-600 font-semibold">Payslip Preview</p>
            <h3 className="text-lg font-bold text-gray-900">Company Payroll Statement</h3>
            <p className="text-xs text-gray-500">Review basic details before opening full document.</p>
          </div>
          <button onClick={closePreview} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close preview">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!previewRow ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No payslip selected.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Company</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{process.env.NEXT_PUBLIC_APP_NAME || "HR Management"}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5" /> Payslip period</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{previewRow.period_start} → {previewRow.period_end}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><User className="w-3.5 h-3.5" /> Employee information</p>
                <p className="mt-2 text-base font-bold text-gray-900">{`${previewRow.employee?.full_name || ""} ${previewRow.employee?.first_name || ""} ${previewRow.employee?.last_name || ""}`.trim() || "Employee"}</p>
                <p className="text-sm text-gray-600">Code: {previewRow.employee?.employee_code || "-"}</p>
                <p className="text-sm text-gray-600">Department: {previewRow.employee?.department?.name || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs uppercase font-semibold text-emerald-700">Net Pay</p>
                  <p className="text-xl font-bold text-emerald-800 mt-1">{currency(previewRow.net_pay)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase font-semibold text-slate-600">Gross Pay</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{currency(previewRow.gross_pay)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => openPayslip(previewRow)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Open Full Payslip
                </button>
                <button
                  onClick={() => downloadPayslip(previewRow)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Print / PDF
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </HRMSSidebar>
  );
}
