"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";

type EmployeeListItem = {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  department?: string;
  position?: string;
  status?: string;
};

export default function ManagerTeamPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const displayEmployees = useMemo(() => employees, [employees]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // Best-effort: if backend supports scoping by manager, it can apply it server-side.
        const res = await api.get("/api/v1/employees");
        const data: unknown = (res.data as { data?: unknown } | undefined)?.data ?? res.data;
        const list = Array.isArray(data)
          ? data
          : typeof data === "object" && data && "data" in data
            ? ((data as { data?: unknown }).data as unknown)
            : [];

        setEmployees(Array.isArray(list) ? (list as EmployeeListItem[]) : []);
      } catch (err: unknown) {
        console.error(err);
        const message =
          typeof err === "object" && err && "response" in err
            ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message as string | undefined)
            : undefined;
        setError(message || "Failed to load employees (manager permission may be required)");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  return (
    <HRMSSidebar>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Employees</h1>
            <p className="text-sm text-gray-500">View employees you can manage.</p>
          </div>
          <Link href="/manager" className="text-sm text-blue-600 hover:underline">
            Back to Manager Portal
          </Link>
        </div>

        {error ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div> : null}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-900">Employees</div>
            <div className="text-xs text-gray-500">Total: {displayEmployees.length}</div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Employee Code</th>
                    <th className="text-left px-4 py-3 font-medium">Department</th>
                    <th className="text-left px-4 py-3 font-medium">Position</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    displayEmployees.map((emp) => {
                      const name = emp.full_name || `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || `#${emp.id}`;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-3 text-gray-700">{emp.employee_code || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{emp.department || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{emp.position || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{emp.status || "-"}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/employees/${emp.id}`} className="text-sm text-blue-600 hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </HRMSSidebar>
  );
}
