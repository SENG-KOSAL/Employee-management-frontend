"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";
import {
  buildEmployeeExportFilename,
  downloadBlobFile,
  exportEmployees,
  type ExportEmployeesFilters,
} from "@/services/employees";

type Props = {
  filters?: ExportEmployeesFilters;
  companyId?: string | number | null;
  className?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

const getApiErrorMessage = (err: unknown) => {
  const message =
    (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ||
    (err as { message?: unknown })?.message;

  if (typeof message === "string" && message.trim()) return message;
  return "Failed to export employees. Please check your active company and try again.";
};

export default function ExportEmployeesButton({
  filters = {},
  companyId,
  className = "",
  onSuccess,
  onError,
}: Props) {
  const { activeCompany } = useActiveCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveCompanyId = useMemo(() => {
    if (companyId !== undefined && companyId !== null && String(companyId).trim()) {
      return String(companyId);
    }
    if (activeCompany?.id) return activeCompany.id;
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("active_company_id") || "current-company";
    }
    return "current-company";
  }, [activeCompany?.id, companyId]);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await exportEmployees(filters);
      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      downloadBlobFile(blob, buildEmployeeExportFilename(effectiveCompanyId));
      onSuccess?.();
    } catch (err) {
      const nextError = getApiErrorMessage(err);
      setError(nextError);
      onError?.(nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60",
          className,
        ].join(" ")}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? "Exporting..." : "Export Employees"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
