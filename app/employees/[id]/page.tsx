"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, Mail, Phone, Badge, Building2, UserCircle2 } from "lucide-react";

interface EmployeeDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: string;
  employee_code?: string;
  user?: { id: number; name: string; role: string };
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (id) fetchEmployee(id);
  }, [id, router]);

  const fetchEmployee = async (empId: string | number) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/employees/${empId}`);
      const data = res.data.data || res.data;
      setEmployee(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        <button
          onClick={() => router.push("/employees")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {employee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-lg font-semibold">
                  {employee.first_name?.[0]?.toUpperCase() || "E"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </h1>
                  <p className="text-sm text-gray-500">Employee Code: {employee.employee_code || "-"}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${employee.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {employee.status || "Active"}
              </span>
            </div>

            <div className="p-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" /> {employee.email}
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" /> {employee.phone}
                  </div>
                )}
                {employee.user && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <UserCircle2 className="w-4 h-4" /> Account: {employee.user.name} ({employee.user.role})
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4" /> Department: {employee.department || "-"}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Badge className="w-4 h-4" /> Position: {employee.position || "-"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HRMSSidebar>
  );
}


//this page is for view detail of a single employee