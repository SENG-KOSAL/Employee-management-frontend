"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getMe, getToken } from "@/utils/auth";
import { ArrowLeft, Download, Printer, X } from "lucide-react";
import { PayslipDocument, PayslipData, PayrollAdjustment } from "@/components/payroll/PayslipDocument";
import { PayslipStyles } from "@/components/payroll/PayslipStyles";

interface CompanyInfo {
  name: string;
}

interface MePayload {
  company?: {
    id?: number;
    name?: string;
  } | null;
}

type AdjustmentKind = "earning" | "deduction";

type AdjustmentForm = {
  kind: AdjustmentKind;
  amount: string;
  description: string;
};

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Company Name",
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

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  const payrollId = params?.payrollId as string;
  const [data, setData] = useState<PayslipData | null>(null);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(false);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [adjustmentsError, setAdjustmentsError] = useState("");
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    kind: "earning",
    amount: "",
    description: "",
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    void Promise.all([fetchDetail(), fetchAdjustments()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/payrolls/${payrollId}`);
      const detail = res.data?.data ?? res.data;
      await resolveCompanyName(detail);
      setData(detail);
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, "Failed to load payslip"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    try {
      setAdjustmentsLoading(true);
      setAdjustmentsError("");
      const res = await api.get(`/api/v1/payrolls/${payrollId}/adjustments`);
      const detail = res.data?.data ?? res.data ?? [];
      setAdjustments(Array.isArray(detail) ? detail : []);
    } catch (err: unknown) {
      console.error(err);
      setAdjustmentsError(getApiErrorMessage(err, "Failed to load adjustments"));
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  const resolveCompanyName = async (detail: PayslipData) => {
    const detailCompanyName = detail.employee?.company?.name || detail.company?.name;
    
    if (detailCompanyName) {
      setCompany({ name: detailCompanyName });
      return;
    }

    const cachedMe = getMe<MePayload>();
    const meCompanyName = cachedMe?.company?.name;

    if (meCompanyName) {
      setCompany({ name: meCompanyName });
      return;
    }

    try {
      const meRes = await api.get("/api/v1/me");
      const meData = meRes.data?.data ?? meRes.data;
      const apiCompanyName = meData?.company?.name;
      setCompany({ name: apiCompanyName || "Company Name" });
    } catch {
      setCompany(DEFAULT_COMPANY);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const canAdjust = data?.status === "approved" || data?.status === "paid";

  const openAdjustmentModal = () => {
    if (!canAdjust) return;
    setAdjustmentsError("");
    setAdjustmentForm({ kind: "earning", amount: "", description: "" });
    setShowAdjustmentModal(true);
  };

  const closeAdjustmentModal = () => {
    if (savingAdjustment) return;
    setShowAdjustmentModal(false);
  };

  const submitAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number(adjustmentForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAdjustmentsError("Amount must be greater than 0.");
      return;
    }

    if (!adjustmentForm.description.trim()) {
      setAdjustmentsError("Description is required.");
      return;
    }

    try {
      setSavingAdjustment(true);
      setAdjustmentsError("");
      await api.post(`/api/v1/payrolls/${payrollId}/adjustments`, {
        kind: adjustmentForm.kind,
        amount: parsedAmount,
        description: adjustmentForm.description.trim(),
      });
      await Promise.all([fetchDetail(), fetchAdjustments()]);
      setShowAdjustmentModal(false);
      setAdjustmentForm({ kind: "earning", amount: "", description: "" });
    } catch (err: unknown) {
      console.error(err);
      setAdjustmentsError(getApiErrorMessage(err, "Failed to add adjustment"));
    } finally {
      setSavingAdjustment(false);
    }
  };

  return (
    <HRMSSidebar>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 print-container bg-slate-50 print:bg-white min-h-screen">
        
        {/* Action Buttons Header (Hidden on Print) */}
        <div className="flex items-center justify-between print:hidden pt-6">
          <div>
            <button
              onClick={() => router.push(`/payroll/${runId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Payroll
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 print:hidden">{error}</div>
        )}

        {loading || !data ? (
          <div className="p-12 bg-white border border-slate-200 rounded-xl text-center text-slate-500 shadow-sm">Loading financial data...</div>
        ) : (
          <PayslipDocument
            data={data}
            companyName={company.name}
            adjustments={adjustments}
            adjustmentsLoading={adjustmentsLoading}
            adjustmentsError={adjustmentsError}
            canAdjust={canAdjust}
            onAddAdjustment={openAdjustmentModal}
            payrollRunId={runId as string}
          />
        )}
      </div>

      {showAdjustmentModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add Adjustment</h2>
                <p className="text-sm text-slate-500">Create a manual earning or deduction for this payroll.</p>
              </div>
              <button
                type="button"
                onClick={closeAdjustmentModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close adjustment modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitAdjustment} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm text-slate-700">
                  <span className="text-xs font-semibold uppercase text-slate-500">Type</span>
                  <select
                    value={adjustmentForm.kind}
                    onChange={(event) => setAdjustmentForm((current) => ({ ...current, kind: event.target.value as AdjustmentKind }))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-sm text-slate-700">
                  <span className="text-xs font-semibold uppercase text-slate-500">Amount</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={adjustmentForm.amount}
                    onChange={(event) => setAdjustmentForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0.00"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase text-slate-500">Description</span>
                <textarea
                  value={adjustmentForm.description}
                  onChange={(event) => setAdjustmentForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  placeholder="Explain why this adjustment is being added"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {adjustmentsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {adjustmentsError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdjustmentModal}
                  disabled={savingAdjustment}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAdjustment ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PayslipStyles />
    </HRMSSidebar>
  );
}
