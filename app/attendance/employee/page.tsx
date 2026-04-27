"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut as LogOutIcon } from "lucide-react";
import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";
import api from "@/services/api";
import { getMe, getToken, saveMe } from "@/utils/auth";

type MePayload = {
  employee?: {
    id?: number;
  } | null;
} | null;

interface AttendanceRecord {
  id: number;
  employee_id: number;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  is_late: boolean;
  date: string;
  attendance_status?: string | null;
}

export default function EmployeeAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<MePayload>(() => getMe<MePayload>() || null);
  const [todayStatus, setTodayStatus] = useState<AttendanceRecord | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clocking, setClocking] = useState(false);

  const employeeId = useMemo(() => user?.employee?.id ?? null, [user]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    if (!employeeId) return;
    fetchTodayStatus();
    fetchAttendances();
  }, [employeeId, page, fromDate, toDate]);

  const loadUser = async () => {
    try {
      const cached = getMe();
      if (cached) {
        setUser(cached);
        return;
      }
      const res = await api.get("/api/v1/me");
      const data = res.data?.data ?? res.data;
      setUser(data);
      saveMe(data);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const fetchTodayStatus = async () => {
    if (!employeeId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({ from: today, to: today, per_page: "1", employee_id: String(employeeId) });
      const res = await api.get(`/api/v1/attendances?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const items = Array.isArray(data) ? data : data?.data ?? [];
      setTodayStatus(items[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendances = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), per_page: "10", employee_id: String(employeeId) });
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await api.get(`/api/v1/attendances?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAttendances(list);
      if (Array.isArray(data)) {
        setTotalPages(1);
      } else {
        setTotalPages((data?.last_page as number) || data?.meta?.last_page || 1);
      }
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (value: string | null) => {
    if (!value) return "--:--";
    try {
      return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const handleClock = async (type: "in" | "out") => {
    if (!employeeId) return;
    try {
      setClocking(true);
      setError("");
      setSuccess("");
      const res = await api.post(`/api/v1/attendances/clock-${type}`);
      const data = res.data?.data ?? res.data;
      setTodayStatus((prev) => ({ ...(prev || {}), ...data } as AttendanceRecord));
      setSuccess(type === "in" ? "Clocked in" : "Clocked out");
      setTimeout(() => setSuccess(""), 2000);
      fetchAttendances();
    } catch (err: unknown) {
      console.error(err);
      const message =
        typeof err === "object" && err && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message as string | undefined)
          : undefined;
      setError(message || `Failed to clock ${type}`);
    } finally {
      setClocking(false);
    }
  };

  return (
    <EmployeeSidebar>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-500 text-sm">Clock your day and review your own history.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Today</p>
              <h2 className="text-xl font-semibold text-gray-900">{new Date().toLocaleDateString()}</h2>
              {todayStatus?.check_in && (
                <p className="text-sm text-gray-600 mt-1">Clocked in at {formatTime(todayStatus.check_in)}</p>
              )}
              {todayStatus?.check_out && (
                <p className="text-sm text-gray-600">Clocked out at {formatTime(todayStatus.check_out)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleClock("in")}
                disabled={clocking || !!todayStatus?.check_in}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-50"
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Clock In
              </button>
              <button
                onClick={() => handleClock("out")}
                disabled={clocking || !todayStatus?.check_in || !!todayStatus?.check_out}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold border border-gray-200 disabled:opacity-50"
              >
                <LogOutIcon className="w-4 h-4 inline mr-2" />
                Clock Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Attendance History</h3>
              <p className="text-sm text-gray-500">Only your records are shown.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">No records found</td>
                  </tr>
                ) : (
                  attendances.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {new Date(record.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{formatTime(record.check_in)}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{formatTime(record.check_out)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            record.is_late ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {record.is_late ? "Late" : "On Time"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </EmployeeSidebar>
  );
}
