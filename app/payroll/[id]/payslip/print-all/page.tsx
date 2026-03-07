"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getMe, getToken } from "@/utils/auth";
import { ArrowLeft, Printer } from "lucide-react";
import { PayslipDocument, PayslipData } from "@/components/payroll/PayslipDocument";
import { PayslipStyles } from "@/components/payroll/PayslipStyles";
import { formatDate } from "@/utils/format";

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
  payrolls: PayslipData[];
}

interface CompanyInfo {
  name: string;
}

interface MePayload {
  company?: {
    id?: number;
    name?: string;
  } | null;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Company Name",
};

export default function PrintAllPayslipsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const runId = params?.id as string;
  const [data, setData] = useState<PayrollRunDetail | null>(null);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/payroll-runs/${runId}`);
      const detail = res.data?.data ?? res.data;
      await resolveCompanyInfo(detail);
      setData(detail);
    } catch (err) {
      console.error(err);
      setError("Failed to load payroll run");
    } finally {
      setLoading(false);
    }
  };

  const resolveCompanyInfo = async (detail: PayrollRunDetail) => {
    const cachedMe = getMe<MePayload>();
    const meCompanyName = cachedMe?.company?.name;

    if (meCompanyName) {
      setCompany({ name: meCompanyName });
      return;
    }

    setCompanyLoading(true);
    try {
      const meRes = await api.get("/api/v1/me");
      const meData = meRes.data?.data ?? meRes.data;
      const apiCompanyName = meData?.company?.name;

      setCompany({ name: apiCompanyName || "Company Name" });
    } catch {
      setCompany(DEFAULT_COMPANY);
    } finally {
      setCompanyLoading(false);
    }
  };

  const payrolls = useMemo(() => data?.payrolls || [], [data?.payrolls]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const auto = searchParams.get("auto");
    if (auto !== "1") return;
    if (!loading && !companyLoading && data && !printed) {
      setPrinted(true);
      // Delay slightly to allow layout to paint before invoking print
      setTimeout(() => window.print(), 150);
    }
  }, [searchParams, loading, companyLoading, data, printed]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-6xl mx-auto print:max-w-none print-container">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">{company.name || "Payslips"}</p>
            <h1 className="text-2xl font-bold text-gray-900">Print All Payslips</h1>
            <p className="text-sm text-gray-500">Print-ready pages for every employee in this run.</p>
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

        {loading || companyLoading || !data ? (
          <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-8">
            <div className="print:hidden">
              <p className="text-sm text-gray-600">Payroll Run #{runId} • Period: {formatDate(data.period_start)} - {formatDate(data.period_end)}</p>
              <p className="text-xs text-gray-500">{payrolls.length} payslips will be printed.</p>
            </div>
            {payrolls.map((p, idx) => (
              <PayslipDocument
                key={p.id}
                data={p}
                companyName={company.name}
                payrollRunId={runId as string}
                idx={idx}
                totalCount={payrolls.length}
              />
            ))}
          </div>
        )}
      </div>
      <PayslipStyles />
    </HRMSSidebar>
  );
}
