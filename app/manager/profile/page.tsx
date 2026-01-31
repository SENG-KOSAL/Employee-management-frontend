"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getMe, getToken, saveMe } from "@/utils/auth";

type MePayload = {
  name?: string;
  employee?: {
    id?: number;
    full_name?: string | null;
    role?: string | null;
  } | null;
  role?: string | null;
};

type EmployeeDetail = {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  employee_code?: string;
  department?: string;
  position?: string;
  status?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  start_date?: string;
};

export default function ManagerProfilePage() {
  const router = useRouter();
  const [me, setMeState] = useState<MePayload | null>(() => getMe<MePayload>());
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const employeeId = useMemo(() => me?.employee?.id ?? null, [me]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const ensureMe = async () => {
      if (me?.employee?.id) return;
      try {
        const res = await api.get("/api/v1/me");
        const data = res.data?.data ?? res.data;
        setMeState(data);
        saveMe(data);
      } catch {
        router.push("/auth/login");
      }
    };

    ensureMe();
  }, [router, me?.employee?.id]);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/api/v1/employees/${employeeId}`);
        const data = res.data?.data ?? res.data;
        setEmployee(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const displayName =
    employee?.full_name ||
    `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() ||
    me?.employee?.full_name ||
    me?.name ||
    "";

  return (
    <HRMSSidebar>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Your personal information.</p>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>
        ) : null}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="text-lg font-semibold text-gray-900">{displayName || "-"}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Employee Code</div>
                  <div className="font-medium text-gray-900">{employee?.employee_code || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium text-gray-900">{employee?.status || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium text-gray-900">{employee?.email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900">{employee?.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Department</div>
                  <div className="font-medium text-gray-900">{employee?.department || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Position</div>
                  <div className="font-medium text-gray-900">{employee?.position || "-"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </HRMSSidebar>
  );
}
