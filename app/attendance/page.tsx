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
  const [rowClockingId, setRowClockingId] = useState<number | null>(null);
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
      const res = await api.post("/api/v1/attendances/clock-in");
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) setTodayStatus((prev: any) => ({ ...prev, ...data }));
      else setTodayStatus((prev: any) => ({ ...prev, check_in: new Date().toISOString() }));
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
      const res = await api.post("/api/v1/attendances/clock-out");
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) setTodayStatus((prev: any) => ({ ...prev, ...data }));
      else setTodayStatus((prev: any) => ({ ...prev, check_out: new Date().toISOString() }));
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
      const res = await api.post(`/api/v1/attendances/clock-${type}`, {
        employee_id: Number(actionEmployeeId),
      });
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) {
        setTodayStatuses((prev) => ({
          ...prev,
          [Number(actionEmployeeId)]: {
            ...(prev[Number(actionEmployeeId)] || { employee_id: Number(actionEmployeeId) }),
            ...data,
          },
        }));
      }
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

  const handleRowClock = async (type: "in" | "out", employeeId: number) => {
    try {
      setAdminClocking(true);
      setRowClockingId(employeeId);
      const res = await api.post(`/api/v1/attendances/clock-${type}`, {
        employee_id: Number(employeeId),
      });
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) {
        setTodayStatuses((prev) => ({
          ...prev,
          [employeeId]: { ...(prev[employeeId] || { employee_id: employeeId }), ...data },
        }));
      } else {
        const stamp = new Date().toISOString();
        setTodayStatuses((prev) => ({
          ...prev,
          [employeeId]: {
            ...(prev[employeeId] || { employee_id: employeeId }),
            [type === "in" ? "check_in" : "check_out"]: stamp,
          },
        }));
      }
      setSuccess(`Clocked ${type === "in" ? "in" : "out"} successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      fetchAttendances();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to clock ${type}`);
    } finally {
      setAdminClocking(false);
      setRowClockingId(null);
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
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your daily attendance and view history.</p>
          </div>
          <div className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            {success}
          </div>
        )}

        {/* Clock In/Out Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl p-8 sm:p-10">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
              </h2>
              <p className="text-blue-100 mt-2 text-lg">
                {todayStatus?.check_in
                  ? `You clocked in at ${formatTime(todayStatus.check_in)}`
                  : "Ready to start your day?"}
              </p>
              {todayStatus?.check_in && todayStatus?.check_out && (
                <div className="mt-6 flex flex-wrap gap-6 justify-center lg:justify-start">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">Total Hours</p>
                    <p className="text-2xl font-bold mt-1">{todayStatus.total_hours?.toFixed(2) || "-"} <span className="text-sm font-normal text-blue-200">hrs</span></p>
                  </div>
                  {todayStatus.is_late && (
                    <div className="bg-red-500/20 backdrop-blur-sm rounded-xl px-5 py-3 border border-red-400/30">
                      <p className="text-red-100 text-xs uppercase tracking-wider font-semibold">Status</p>
                      <p className="text-2xl font-bold mt-1 text-red-50">Late</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={handleClockIn}
                disabled={!!todayStatus?.check_in || clocking}
                className="group relative flex items-center justify-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg min-w-[160px]"
              >
                <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>
                  {todayStatus?.check_in
                    ? `In ${formatTime(todayStatus.check_in)}`
                    : clocking
                    ? "..."
                    : "Clock In"}
                </span>
              </button>
              <button
                onClick={handleClockOut}
                disabled={!todayStatus?.check_in || !!todayStatus?.check_out || clocking}
                className="group relative flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl shadow-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg min-w-[160px]"
              >
                <LogOutIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>
                  {todayStatus?.check_out
                    ? `Out ${formatTime(todayStatus.check_out)}`
                    : clocking
                    ? "..."
                    : "Clock Out"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin & Filters Container */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Admin Controls */}
          {isAdminOrHr && (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Manual Entry</h3>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">Admin Only</span>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Employee</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border-none rounded-t-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all text-black"
                    />
                    <select
                      value={actionEmployeeId}
                      onChange={(e) => setActionEmployeeId(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border-t border-gray-200 rounded-b-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none text-black"
                    >
                      <option value="">Select from list...</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => handleAdminClock("in")}
                    disabled={!actionEmployeeId || adminClocking}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm shadow-blue-200"
                  >
                    <Clock className="w-4 h-4" /> Clock In
                  </button>
                  <button
                    onClick={() => handleAdminClock("out")}
                    disabled={!actionEmployeeId || adminClocking}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    <LogOutIcon className="w-4 h-4" /> Clock Out
                  </button>
                </div>
              </div>
              
              {selectedAdminStatus && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Check In</span>
                    <span className="font-semibold text-gray-900">{selectedAdminStatus.check_in ? formatTime(selectedAdminStatus.check_in) : "--:--"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Check Out</span>
                    <span className="font-semibold text-gray-900">{selectedAdminStatus.check_out ? formatTime(selectedAdminStatus.check_out) : "--:--"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Status</span>
                    <span className={`font-medium ${selectedAdminStatus.is_late ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedAdminStatus.is_late ? "Late" : "On Time"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className={`${isAdminOrHr ? 'xl:col-span-1' : 'xl:col-span-3'} bg-white rounded-2xl shadow-sm border border-gray-100 p-6`}>
            <h3 className="text-lg font-bold text-gray-900 mb-6">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Employee</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> On Time
              <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Late
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdminOrHr && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-sm font-medium">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                          <Calendar className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No records found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendances.map((record) => {
                    const emp = record.employee || employeeLookup[record.employee_id];
                    const firstName = emp?.first_name || "Unknown";
                    const lastName = emp?.last_name || "";
                    const empCode = (emp as any)?.employee_code || "";

                    return (
                    <tr key={record.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {firstName[0]}{lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{firstName} {lastName}</p>
                            <p className="text-xs text-gray-400">{empCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {record.check_in ? formatTime(record.check_in) : "--:--"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {record.check_out ? formatTime(record.check_out) : "--:--"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            record.is_late
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-green-50 text-green-700 border-green-100"
                          }`}
                        >
                          {record.is_late ? "Late" : "On Time"}
                        </span>
                      </td>
                      {isAdminOrHr && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleRowClock("in", record.employee_id)}
                              disabled={!!todayStatuses[record.employee_id]?.check_in}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Clock In"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRowClock("out", record.employee_id)}
                              disabled={!todayStatuses[record.employee_id]?.check_in || !!todayStatuses[record.employee_id]?.check_out}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Clock Out"
                            >
                              <LogOutIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </HRMSSidebar>
  );
}
