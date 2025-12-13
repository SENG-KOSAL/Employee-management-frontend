"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { Clock, LogOut as LogOutIcon, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";

interface AttendanceRecord {
  id: number;
  employee_id: number;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  is_late: boolean;
  date: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

export default function AttendancePage() {
  const router = useRouter();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [user, setUser] = useState<any>(null);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [clocking, setClocking] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchUser();
    fetchAttendances();
    checkTodayStatus();
  }, [page, fromDate, toDate, router]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/me");
      setUser(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const checkTodayStatus = async () => {
    try {
      const res = await api.get("/attendances");
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = res.data.data?.find(
        (a: AttendanceRecord) => a.date === today
      ) || res.data?.find((a: AttendanceRecord) => a.date === today);
      setTodayStatus(todayRecord || null);
    } catch (err) {
      console.error("Failed to check today status:", err);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "10",
      });
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await api.get(`/attendances?${params}`);
      const data = res.data.data || res.data;

      if (Array.isArray(data)) {
        setAttendances(data);
        setTotalPages(1);
      } else {
        setAttendances(data.data || []);
        setTotalPages(data.last_page || 1);
      }
      setError("");
    } catch (err) {
      setError("Failed to load attendance records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setClocking(true);
      await api.post("/attendances/clock-in");
      setSuccess("Clocked in successfully!");
      setTimeout(() => setSuccess(""), 3000);
      checkTodayStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clock in");
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClocking(true);
      await api.post("/attendances/clock-out");
      setSuccess("Clocked out successfully!");
      setTimeout(() => setSuccess(""), 3000);
      checkTodayStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clock out");
    } finally {
      setClocking(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Track your daily clock in and out</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        {/* Clock In/Out Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Today's Status</h2>
              <p className="text-blue-100 mt-2">
                {todayStatus?.check_in
                  ? `Clocked in at ${formatTime(todayStatus.check_in)}`
                  : "You haven't clocked in yet"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClockIn}
                disabled={!!todayStatus?.check_in || clocking}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Clock className="w-5 h-5" />
                {clocking ? "Processing..." : "Clock In"}
              </button>
              <button
                onClick={handleClockOut}
                disabled={!todayStatus?.check_in || !!todayStatus?.check_out || clocking}
                className="flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <LogOutIcon className="w-5 h-5" />
                {clocking ? "Processing..." : "Clock Out"}
              </button>
            </div>
          </div>

          {todayStatus?.check_in && todayStatus?.check_out && (
            <div className="mt-4 pt-4 border-t border-blue-400 flex gap-8">
              <div>
                <p className="text-blue-100 text-sm">Total Hours</p>
                <p className="text-xl font-bold mt-1">
                  {todayStatus.total_hours?.toFixed(2) || "-"} hrs
                </p>
              </div>
              {todayStatus.is_late && (
                <div>
                  <p className="text-blue-100 text-sm">Status</p>
                  <p className="text-xl font-bold mt-1 text-red-300">Late</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Attendance</h3>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : attendances.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.employee
                          ? `${record.employee.first_name} ${record.employee.last_name}`
                          : "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatTime(record.check_in)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.check_out ? formatTime(record.check_out) : "Not clocked out"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.total_hours ? `${record.total_hours.toFixed(2)} hrs` : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.is_late
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {record.is_late ? "Late" : "On Time"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </HRMSSidebar>
  );
}
