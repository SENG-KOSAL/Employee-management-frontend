"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { ArrowLeft, Printer } from "lucide-react";

interface Employee {
  id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: { name?: string };
  position?: string;
}

interface PayrollDetail {
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
}

const currency = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value || "0") : value || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  const payrollId = params?.payrollId as string;
  const [data, setData] = useState<PayrollDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError("");
      // Attempt to fetch a single payroll line by id
      const res = await api.get(`/api/v1/payrolls/${payrollId}`);
      const detail = res.data?.data ?? res.data;
      setData(detail);
    } catch (err) {
      console.error(err);
      setError("Failed to load payslip");
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = useMemo(() => {
    if (!data?.period_start) return "-";
    const d = new Date(data.period_start);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [data?.period_start]);

  const payDateLabel = useMemo(() => formatDate(data?.paid_at || data?.period_end), [data?.paid_at, data?.period_end]);
  const payTypeLabel = useMemo(() => (data?.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : "-"), [data?.status]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print-container">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Payslip</p>
            <h1 className="text-2xl font-bold text-gray-900">Employee Payslip</h1>
            <p className="text-sm text-gray-500">Print-ready slip for the selected employee.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/payroll/${runId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 print:hidden">{error}</div>
        )}

        {loading || !data ? (
          <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-0 print:p-6">
            <div className="flex flex-col gap-6 border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-blue-700 font-semibold">Company Name</p>
                  <h2 className="text-2xl font-bold text-gray-900">Payslip</h2>
                  <p className="text-sm text-gray-500">1234 Court Road, London W1T 1JY, UK</p>
                  <p className="text-sm text-gray-500">Phone: +44 00 0000 0000 • Email: name@provider.com</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-gray-500">Pay Date</p>
                  <p className="text-sm font-semibold text-gray-900">{payDateLabel}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                    <div className="text-left">
                      <p className="text-xs uppercase text-gray-500">Pay Type</p>
                      <p className="font-semibold">{payTypeLabel}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase text-gray-500">Period</p>
                      <p className="font-semibold">{periodLabel}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase text-gray-500">Payroll #</p>
                      <p className="font-semibold">{runId}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase text-gray-500">Employee Code</p>
                      <p className="font-semibold">{data.employee?.employee_code || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Employee Information</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{data.employee?.full_name || `${data.employee?.first_name || ""} ${data.employee?.last_name || ""}` || "-"}</p>
                  <p className="text-sm text-gray-700">Address: -</p>
                  <p className="text-sm text-gray-700">Department: {data.employee?.department?.name || "-"}</p>
                  <p className="text-sm text-gray-700">Position: {data.employee?.position || "-"}</p>
                  <p className="text-sm text-gray-700">Email: -</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Period Start</p>
                    <p className="font-semibold">{formatDate(data.period_start)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Period End</p>
                    <p className="font-semibold">{formatDate(data.period_end)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Payment Method</p>
                    <p className="font-semibold">Bank transfer</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Status</p>
                    <p className="font-semibold">{payTypeLabel}</p>
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
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(data.base_pay)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{currency(data.base_pay)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-800">Overtime Pay</td>
                      <td className="px-4 py-2 text-center text-gray-500">-</td>
                      <td className="px-4 py-2 text-center text-gray-500">-</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(data.overtime_pay)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{currency(data.overtime_pay)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-800">Benefits</td>
                      <td className="px-4 py-2 text-center text-gray-500">-</td>
                      <td className="px-4 py-2 text-center text-gray-500">-</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(data.benefits_total)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{currency(data.benefits_total)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold text-gray-900">
                      <td className="px-4 py-2">Gross Pay</td>
                      <td className="px-4 py-2 text-center text-gray-600">-</td>
                      <td className="px-4 py-2 text-center text-gray-600">-</td>
                      <td className="px-4 py-2 text-right">{currency(data.gross_pay)}</td>
                      <td className="px-4 py-2 text-right">{currency(data.gross_pay)}</td>
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
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(data.deductions_total)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{currency(data.deductions_total)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-800">Unpaid Leave</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{currency(data.unpaid_leave_deduction)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{currency(data.unpaid_leave_deduction)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold text-gray-900">
                      <td className="px-4 py-2">Total Deductions</td>
                      <td className="px-4 py-2 text-right">{currency(Number(data.deductions_total || 0) + Number(data.unpaid_leave_deduction || 0))}</td>
                      <td className="px-4 py-2 text-right">{currency(Number(data.deductions_total || 0) + Number(data.unpaid_leave_deduction || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                <div className="col-span-1 md:col-span-2" />
                <div className="p-4 rounded-xl bg-gray-900 text-white shadow-sm">
                  <p className="text-xs uppercase tracking-wide">Net Pay</p>
                  <p className="text-3xl font-bold mt-1">{currency(data.net_pay)}</p>
                  <p className="text-xs text-gray-200 mt-1">Total gross minus deductions</p>
                </div>
              </div>
            </div>

            {data.notes && (
              <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Notes</p>
                <p className="text-sm text-gray-800 mt-1">{data.notes}</p>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 flex flex-col gap-1">
              <p>If you have any questions about this payslip, please contact HR.</p>
              <p>Email: hr@company.com • Phone: +44 00 0000 0000</p>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }
        @media print {
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            background: #fff;
            color: #000;
          }
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          aside,
          header,
          nav,
          [data-sidebar],
          [data-sidebar-trigger],
          .sidebar,
          .Sidebar,
          .SidebarContent,
          .SidebarInset,
          .SidebarProvider,
          .SidebarTrigger {
            display: none !important;
            visibility: hidden !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            page-break-inside: avoid;
          }
          .print-container .bg-white,
          .print-container .border,
          .print-container .rounded-2xl,
          .print-container .shadow-sm {
            box-shadow: none !important;
          }
          .print-container table,
          .print-container tr,
          .print-container td,
          .print-container th {
            page-break-inside: avoid;
          }
          .print-container .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </HRMSSidebar>
  );
}
