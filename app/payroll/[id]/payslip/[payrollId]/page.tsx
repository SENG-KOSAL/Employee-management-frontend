"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getMe, getToken } from "@/utils/auth";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { PayslipDocument, PayslipData } from "@/components/payroll/PayslipDocument";
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

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Company Name",
};

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  const payrollId = params?.payrollId as string;
  const [data, setData] = useState<PayslipData | null>(null);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [companyLoading, setCompanyLoading] = useState(false);
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
      const res = await api.get(`/api/v1/payrolls/${payrollId}`);
      const detail = res.data?.data ?? res.data;
      await resolveCompanyName(detail);
      setData(detail);
    } catch (err) {
      console.error(err);
      setError("Failed to load payslip");
    } finally {
      setLoading(false);
    }
  };

  const resolveCompanyName = async (detail: PayslipData) => {
    // Try to get company name from detail first (if API returns it)
    // The previous implementation checked detail.company_id or detail.company
    // But simplified logic is just name.
    // detail technically has company property if extended properly, but basic check:
    const detailAny = detail as any;
    const detailCompanyName = detailAny?.employee?.company?.name || detailAny?.company?.name;
    
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

  const handlePrint = () => {
    window.print();
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
            payrollRunId={runId as string}
          />
        )}
      </div>
      <PayslipStyles />
    </HRMSSidebar>
  );
}
