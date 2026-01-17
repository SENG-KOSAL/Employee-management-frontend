"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { ArrowLeft, Download, Printer } from "lucide-react";

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-4xl mx-auto print:max-w-none">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Payslip</p>
            <h1 className="text-2xl font-bold text-gray-900">Employee Payslip</h1>
            <p className="text-sm text-gray-500">Review or download this payslip.</p>
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-0">
            <div className="flex items-start justify-between gap-6 border-b border-gray-100 pb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{data.employee?.full_name || `${data.employee?.first_name || ""} ${data.employee?.last_name || ""}`}</h2>
                <p className="text-sm text-gray-600">Employee Code: {data.employee?.employee_code || "-"}</p>
                <p className="text-sm text-gray-600">Department: {data.employee?.department?.name || "-"}</p>
                <p className="text-sm text-gray-600">Position: {data.employee?.position || "-"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Company</p>
                <p className="text-lg font-semibold text-gray-900">Your Company</p>
                <p className="text-sm text-gray-600">Month: {periodLabel}</p>
                <p className="text-sm text-gray-600">Status: {data.status}</p>
                <p className="text-sm text-gray-600">Period: {data.period_start} - {data.period_end}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold">Earnings</p>
                <div className="mt-2 space-y-2 text-sm text-gray-800">
                  <div className="flex justify-between"><span>Base pay</span><span className="font-semibold">{currency(data.base_pay)}</span></div>
                  <div className="flex justify-between"><span>Overtime</span><span className="font-semibold">{currency(data.overtime_pay)}</span></div>
                  <div className="flex justify-between"><span>Benefits</span><span className="font-semibold">{currency(data.benefits_total)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200"><span>Gross pay</span><span className="font-bold text-gray-900">{currency(data.gross_pay)}</span></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold">Deductions</p>
                <div className="mt-2 space-y-2 text-sm text-gray-800">
                  <div className="flex justify-between"><span>Deductions</span><span className="font-semibold">{currency(data.deductions_total)}</span></div>
                  <div className="flex justify-between"><span>Unpaid leave</span><span className="font-semibold">{currency(data.unpaid_leave_deduction)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200"><span>Net pay</span><span className="font-bold text-green-700">{currency(data.net_pay)}</span></div>
                </div>
              </div>
            </div>

            {data.notes && (
              <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Notes</p>
                <p className="text-sm text-gray-800 mt-1">{data.notes}</p>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              <p>This payslip is generated electronically. Use the Print / PDF button to export a copy.</p>
            </div>
          </div>
        )}
      </div>
    </HRMSSidebar>
  );
}
