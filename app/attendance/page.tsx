"use client";

import { useEffect, useMemo, useState } from "react";
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
  attendance_status?: string | null;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [actionEmployeeId, setActionEmployeeId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [todayStatuses, setTodayStatuses] = useState<Record<number, AttendanceRecord>>({});
  const [clocking, setClocking] = useState(false);
  const [adminClocking, setAdminClocking] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const employeeLookup = useMemo(() => {
    const map: Record<number, Employee> = {};
    employees.forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter((emp) => {
      const haystack = [
        emp.first_name,
        emp.last_name,
        emp.employee_code,
        emp.email,
        emp.phone,
        emp.department,
        emp.position,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [employees, employeeSearch]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchUser();
    fetchEmployees();
    checkTodayStatus();
    fetchTodayStatuses();
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchAttendances();
  }, [page, fromDate, toDate, employeeFilter]);

  useEffect(() => {
    if (!actionEmployeeId && employees.length > 0) {
      setActionEmployeeId(employees[0].id.toString());
    }
  }, [employees, actionEmployeeId]);

  useEffect(() => {
    if (!actionEmployeeId && filteredEmployees.length > 0) {
      setActionEmployeeId(filteredEmployees[0].id.toString());
    }
  }, [filteredEmployees, actionEmployeeId]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/v1/me");
      setUser(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/api/v1/employees?per_page=200");
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.data || [];
      setEmployees(list);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setError("Failed to load employees");
    }
  };

  const checkTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get(`/api/v1/attendances?from=${today}&to=${today}&per_page=1`);
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.data || [];
      setTodayStatus(items[0] || null);
    } catch (err) {
      console.error("Failed to check today status:", err);
    }
  };

  const fetchTodayStatuses = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get(`/api/v1/attendances?from=${today}&to=${today}&per_page=200`);
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.data || [];
      const map: Record<number, AttendanceRecord> = {};
      items.forEach((item: AttendanceRecord) => {
        map[item.employee_id] = item;
      });
      setTodayStatuses(map);
    } catch (err) {
      console.error("Failed to fetch today statuses:", err);
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
      if (employeeFilter) params.append("employee_id", employeeFilter);

      const res = await api.get(`/api/v1/attendances?${params}`);
      const data = res.data.data || res.data;

      const items = Array.isArray(data) ? data : data.data || [];
      const enriched = items.map((item: AttendanceRecord) => {
        if (!item.employee && employeeLookup[item.employee_id]) {
          const emp = employeeLookup[item.employee_id];
          return {
            ...item,
            employee: {
              first_name: emp.first_name,
              last_name: emp.last_name,
            },
          };
        }
        return item;
      });

      setAttendances(enriched);

      if (Array.isArray(data)) {
        setTotalPages(1);
      } else {
        setTotalPages((data.last_page as number) || data.meta?.last_page || 1);
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
      await api.post("/api/v1/attendances/clock-in");
      setSuccess("Clocked in successfully!");
      setTimeout(() => setSuccess(""), 3000);
      checkTodayStatus();
      fetchTodayStatuses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clock in");
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClocking(true);
      await api.post("/api/v1/attendances/clock-out");
      setSuccess("Clocked out successfully!");
      setTimeout(() => setSuccess(""), 3000);
      checkTodayStatus();
      fetchTodayStatuses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clock out");
    } finally {
      setClocking(false);
    }
  };

  const handleAdminClock = async (type: "in" | "out") => {
    if (!actionEmployeeId) {
      setError("Please select an employee first");
      return;
    }
    try {
      setAdminClocking(true);
      await api.post(`/api/v1/attendances/clock-${type}`, {
        employee_id: Number(actionEmployeeId),
      });
      setSuccess(`Clocked ${type === "in" ? "in" : "out"} successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      fetchTodayStatuses();
      fetchAttendances();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to clock ${type}`);
    } finally {
      setAdminClocking(false);
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

  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";
  const selectedAdminStatus = actionEmployeeId
    ? todayStatuses[Number(actionEmployeeId)]
    : null;

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

        {/* Admin clock controls */}
        {isAdminOrHr && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-60">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search employee</label>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search by name, code, email, phone..."
                  className="w-full px-4 py-2 mb-3 border border-gray-300  text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={actionEmployeeId}
                  onChange={(e) => setActionEmployeeId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select employee</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <option value="" disabled>
                      No matches
                    </option>
                  )}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdminClock("in")}
                  disabled={!actionEmployeeId || adminClocking}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Clock className="w-5 h-5" /> Clock In
                </button>
                <button
                  onClick={() => handleAdminClock("out")}
                  disabled={!actionEmployeeId || adminClocking}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <LogOutIcon className="w-5 h-5" /> Clock Out
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-700 flex gap-6 flex-wrap">
              <div>
                <span className="font-medium">Today:</span>{" "}
                {selectedAdminStatus?.check_in
                  ? `In at ${formatTime(selectedAdminStatus.check_in)}`
                  : "Not clocked in"}
              </div>
              <div>
                <span className="font-medium">Check-out:</span>{" "}
                {selectedAdminStatus?.check_out
                  ? formatTime(selectedAdminStatus.check_out)
                  : "Not clocked out"}
              </div>
              <div>
                <span className="font-medium">Status:</span>{" "}
                {selectedAdminStatus
                  ? selectedAdminStatus.is_late
                    ? "Late"
                    : selectedAdminStatus.attendance_status || "On time"
                  : "-"}
              </div>
            </div>
          </div>
        )}

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
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
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
                          : employeeLookup[record.employee_id]
                          ? `${employeeLookup[record.employee_id].first_name} ${employeeLookup[record.employee_id].last_name}`
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
