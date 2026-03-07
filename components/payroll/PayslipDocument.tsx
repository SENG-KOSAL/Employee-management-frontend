import React from "react";
import { currency, formatDate, capitalize } from "@/utils/format";

export interface PayrollAdjustment {
  id: number;
  kind: "earning" | "deduction";
  amount: number | string;
  description: string;
  created_at?: string | null;
}

export interface Employee {
  id: number;
  company_id?: number;
  company?: { id?: number; name?: string };
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: { name?: string };
  position?: string;
}

export interface PayslipData {
  id: number;
  period_start: string;
  period_end: string;
  paid_at?: string | null;
  status: string;
  base_pay: string;
  overtime_pay: string;
  benefits_total: string;
  deductions_total: string;
  unpaid_leave_deduction: string;
  gross_pay: string;
  net_pay: string;
  notes?: string | null;
  employee?: Employee;
  company?: { name?: string } | null;
}

interface PayslipDocumentProps {
  data: PayslipData;
  companyName: string;
  adjustments: PayrollAdjustment[];
  adjustmentsLoading: boolean;
  adjustmentsError: string;
  canAdjust: boolean;
  onAddAdjustment: () => void;
  payrollRunId?: string | number;
  idx?: number;
  totalCount?: number;
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({
  data: p,
  companyName,
  adjustments,
  adjustmentsLoading,
  adjustmentsError,
  canAdjust,
  onAddAdjustment,
  payrollRunId,
  idx = 0,
  totalCount = 1,
}) => {
  const name = p.employee?.full_name || `${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.trim();
  const payDate = formatDate(p.paid_at || p.period_end);
  const payType = capitalize(p.status);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:p-6 print:shadow-none print:border-0 print:w-full ${
        idx < totalCount - 1 ? "page-break" : ""
      }`}
    >
      <div className="flex flex-col gap-6 border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase text-blue-700 font-semibold">{companyName || "Company Name"}</p>
            <h2 className="text-2xl font-bold text-gray-900">Payslip</h2>
            <p className="text-sm text-gray-500">-</p>
            <p className="text-sm text-gray-500">Phone: - • Email: -</p>
            <p className="text-sm text-gray-500">Tax ID: -</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-gray-500">Pay Date</p>
            <p className="text-sm font-semibold text-gray-900">{payDate}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
              <div className="text-left">
                <p className="text-xs uppercase text-gray-500">Pay Type</p>
                <p className="font-semibold">{payType}</p>
              </div>
              <div className="text-left">
                <p className="text-xs uppercase text-gray-500">Period</p>
                <p className="font-semibold">
                  {formatDate(p.period_start)} - {formatDate(p.period_end)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs uppercase text-gray-500">Payroll #</p>
                <p className="font-semibold">{payrollRunId || "-"}</p>
              </div>
              <div className="text-left">
                <p className="text-xs uppercase text-gray-500">Employee Code</p>
                <p className="font-semibold">{p.employee?.employee_code || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold">Employee Information</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{name || "-"}</p>
            <p className="text-sm text-gray-700">Address: -</p>
            <p className="text-sm text-gray-700">Department: {p.employee?.department?.name || "-"}</p>
            <p className="text-sm text-gray-700">Position: {p.employee?.position || "-"}</p>
            <p className="text-sm text-gray-700">Email: -</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
            <div>
              <p className="text-xs uppercase text-gray-500">Period Start</p>
              <p className="font-semibold">{formatDate(p.period_start)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Period End</p>
              <p className="font-semibold">{formatDate(p.period_end)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Payment Method</p>
              <p className="font-semibold">Bank transfer</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Status</p>
              <p className="font-semibold">{payType}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">Earnings</div>
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-center">Hours</th>
                <th className="px-4 py-2 text-center">Rate</th>
                <th className="px-4 py-2 text-right">Current</th>
                <th className="px-4 py-2 text-right">YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-800">Base Pay</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(p.base_pay)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{currency(p.base_pay)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-800">Overtime Pay</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(p.overtime_pay)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{currency(p.overtime_pay)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-800">Benefits</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-center text-gray-500">-</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(p.benefits_total)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{currency(p.benefits_total)}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold text-gray-900">
                <td className="px-4 py-2">Gross Pay</td>
                <td className="px-4 py-2 text-center text-gray-600">-</td>
                <td className="px-4 py-2 text-center text-gray-600">-</td>
                <td className="px-4 py-2 text-right">{currency(p.gross_pay)}</td>
                <td className="px-4 py-2 text-right">{currency(p.gross_pay)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">Deductions</div>
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Current</th>
                <th className="px-4 py-2 text-right">YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-800">Deductions</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(p.deductions_total)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{currency(p.deductions_total)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-800">Unpaid Leave</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(p.unpaid_leave_deduction)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{currency(p.unpaid_leave_deduction)}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold text-gray-900">
                <td className="px-4 py-2">Total Deductions</td>
                <td className="px-4 py-2 text-right">
                  {currency(Number(p.deductions_total || 0) + Number(p.unpaid_leave_deduction || 0))}
                </td>
                <td className="px-4 py-2 text-right">
                  {currency(Number(p.deductions_total || 0) + Number(p.unpaid_leave_deduction || 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 flex items-center justify-between gap-4">
            <span>Adjustments</span>
            <button
              type="button"
              onClick={onAddAdjustment}
              disabled={!canAdjust}
              className="print:hidden inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add Adjustment
            </button>
          </div>
          {!canAdjust && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Adjustments are available after payroll is approved.
            </div>
          )}
          {adjustmentsError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {adjustmentsError}
            </div>
          )}
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adjustmentsLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="ml-auto h-4 w-24 rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No manual adjustments added.
                  </td>
                </tr>
              ) : (
                adjustments.map((adjustment) => {
                  const isEarning = adjustment.kind === "earning";
                  const amount = Number(adjustment.amount || 0);

                  return (
                    <tr key={adjustment.id}>
                      <td className="px-4 py-3 text-gray-800">{adjustment.description || "Adjustment"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isEarning ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {capitalize(adjustment.kind)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${isEarning ? "text-emerald-600" : "text-red-600"}`}>
                        {isEarning ? "+" : "-"}{currency(Math.abs(amount))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="col-span-1 md:col-span-2" />
          <div className="p-4 rounded-xl bg-gray-900 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wide">Net Pay</p>
            <p className="text-3xl font-bold mt-1">{currency(p.net_pay)}</p>
            <p className="text-xs text-gray-200 mt-1">Total gross minus deductions</p>
          </div>
        </div>
      </div>

      {p.notes && (
        <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 uppercase font-semibold">Notes</p>
          <p className="text-sm text-gray-800 mt-1">{p.notes}</p>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500 flex flex-col gap-1">
        <p>If you have any questions about this payslip, please contact HR.</p>
        <p>Email: hr@company.com • Phone: +44 00 0000 0000</p>
      </div>
    </div>
  );
};
