"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { fetchMe, getCachedMe } from "@/lib/meCache";
import { Clock, LogOut as LogOutIcon, Calendar, ChevronLeft, ChevronRight, X, AlertTriangle, AlertCircle } from "lucide-react";
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
  const [errorDebug, setErrorDebug] = useState<string>("");
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

  const [showDebug, setShowDebug] = useState(false);
  const [confirmAdminClockOut, setConfirmAdminClockOut] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState("10");

  const normalizedRole = (user?.role || "").toLowerCase();
  const isAdminOrHr =
    normalizedRole === "admin" ||
    normalizedRole === "hr" ||
    normalizedRole === "company_admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "super-admin" ||
    normalizedRole === "superadmin" ||
    normalizedRole === "developer";
  const isEmployee = normalizedRole === "employee";

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
    const cached = getCachedMe();
    if (cached) {
      setUser(cached);
      return;
    }

    const loadUser = async () => {
      try {
        const me = await fetchMe();
        setUser(me);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    // lock down scope for employees
    if (user.role === "employee") {
      const empId = user.employee?.id;
      if (empId) {
        setEmployeeFilter(String(empId));
        setEmployees((prev) => {
          const exists = prev.find((e) => e.id === empId);
          if (exists) return prev;
          const fullName = user.employee?.full_name || "";
          const [first_name, ...rest] = fullName.split(" ");
          return [
            {
              id: empId,
              first_name: first_name || user.name || "",
              last_name: rest.join(" ") || "",
              employee_code: user.employee?.employee_code || "",
              email: user.email,
              phone: user.employee?.phone,
              department: user.employee?.department,
              position: user.employee?.position,
            },
          ];
        });
      }
    } else {
      fetchEmployees();
      fetchTodayStatuses();
    }

    checkTodayStatus();
  }, [user]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchAttendances();
  }, [page, pageSize, fromDate, toDate, employeeFilter]);

  useEffect(() => {
    if (!isAdminOrHr) return;
    if (!actionEmployeeId && employees.length > 0) {
      setActionEmployeeId(employees[0].id.toString());
    }
  }, [employees, actionEmployeeId, isAdminOrHr]);

  useEffect(() => {
    if (!isAdminOrHr) return;
    if (!actionEmployeeId && filteredEmployees.length > 0) {
      setActionEmployeeId(filteredEmployees[0].id.toString());
    }
  }, [filteredEmployees, actionEmployeeId, isAdminOrHr]);

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
      const params = new URLSearchParams({ from: today, to: today, per_page: "1" });
      if (user?.role === "employee" && user.employee?.id) {
        params.append("employee_id", String(user.employee.id));
      }
      const res = await api.get(`/api/v1/attendances?${params.toString()}`);
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
      setError("");
      setErrorDebug("");
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize,
      });
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (employeeFilter) params.append("employee_id", employeeFilter);

      const res = await api.get(`/api/v1/attendances?${params.toString()}`);
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
    } catch (err: any) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;
      const errors = err?.response?.data?.errors;
      const message = backendMessage || (status ? `Failed to load attendance records (status ${status})` : "Failed to load attendance records");
      setError(message);
      setErrorDebug(
        JSON.stringify(
          {
            status,
            backendMessage,
            errors,
            query: { page, fromDate, toDate, employeeFilter },
            responseData: err?.response?.data,
          },
          null,
          2
        )
      );

      // Structured console debug for quick diagnosis
      console.error("fetchAttendances error", {
        message,
        status,
        errors,
        query: {
          page,
          fromDate,
          toDate,
          employeeFilter,
        },
        responseData: err?.response?.data,
      });
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

  const executeAdminClockOut = async () => {
    if (!actionEmployeeId) return;
    try {
      setAdminClocking(true);
      const res = await api.post(`/api/v1/attendances/clock-out`, {
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
      setSuccess(`Clocked out successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      fetchTodayStatuses();
      fetchAttendances();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to clock out`);
    } finally {
      setAdminClocking(false);
      setConfirmAdminClockOut(null);
    }
  };

  const handleAdminClock = async (type: "in" | "out") => {
    if (!actionEmployeeId) {
      setError("Please select an employee first");
      return;
    }
    if (type === "out") {
      setConfirmAdminClockOut(Number(actionEmployeeId));
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

  const selectedAdminStatus = actionEmployeeId
    ? todayStatuses[Number(actionEmployeeId)]
    : null;

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance</h1>
              {fromDate === new Date().toISOString().split("T")[0] && toDate === new Date().toISOString().split("T")[0] && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Live Status
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1 text-sm">Manage your daily attendance and view history.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="text-sm font-medium text-blue-800 bg-blue-50 px-4 py-2 rounded-full shadow-sm border border-blue-100">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-start sm:items-center gap-3 flex-col sm:flex-row justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Something went wrong: {error}</span>
            </div>
            {isAdminOrHr && errorDebug && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md transition-colors"
              >
                {showDebug ? "Hide Details" : "Show Details"}
              </button>
            )}
          </div>
        )}

        {showDebug && errorDebug && isAdminOrHr && (
          <pre className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-3 overflow-auto max-h-48 mt-[-1rem]">
{errorDebug}
          </pre>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {success}
            </div>
            <button onClick={() => setSuccess("")} className="text-green-600 hover:text-green-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clock In/Out Card */}
        {isEmployee && (
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-xl p-8 sm:p-10 border border-blue-400/20">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="text-center lg:text-left w-full lg:w-auto">
                <h2 className="text-3xl font-bold tracking-tight">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.employee?.first_name || user?.name?.split(' ')[0] || 'there'}!
                </h2>
                
                {success && success.includes("successfully") && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-green-500/20 text-green-100 px-3 py-1.5 rounded-lg border border-green-400/30 text-sm font-medium animate-in slide-in-from-top-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span> {success.replace('!', '')} at {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center lg:justify-start gap-2">
                  {!todayStatus?.check_in ? (
                     <span className="px-3 py-1.5 bg-red-500/20 border border-red-400/40 rounded-full text-red-100 text-sm font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-red-400"></span> You have not started today
                     </span>
                  ) : todayStatus?.check_in && !todayStatus?.check_out ? (
                     <span className="px-3 py-1.5 bg-green-500/20 border border-green-400/40 rounded-full text-green-100 text-sm font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> You are clocked in
                     </span>
                  ) : (
                     <span className="px-3 py-1.5 bg-blue-500/30 border border-blue-400/40 rounded-full text-blue-100 text-sm font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-400"></span> You completed today's shift
                     </span>
                  )}
                </div>
                
                <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10 flex-1 min-w-[120px]">
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold mb-1">Check In</p>
                    <p className="text-xl font-bold">{todayStatus?.check_in ? formatTime(todayStatus.check_in) : "--:--"}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10 flex-1 min-w-[120px]">
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold mb-1">Check Out</p>
                    <p className="text-xl font-bold">{todayStatus?.check_out ? formatTime(todayStatus.check_out) : "--:--"}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10 flex-1 min-w-[120px]">
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold mb-1">Total Hours</p>
                    <p className="text-xl font-bold">{todayStatus?.total_hours ? todayStatus.total_hours.toFixed(2) : "0.00"} <span className="text-sm font-normal text-blue-200">hrs</span></p>
                  </div>

                  {todayStatus?.is_late && (
                    <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-orange-400/30 flex-1 min-w-[120px]">
                      <p className="text-orange-100 text-xs uppercase tracking-wider font-semibold mb-1">Status</p>
                      <p className="text-xl font-bold text-orange-50">Late</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full sm:w-auto shrink-0 mt-4 lg:mt-0">
                {!todayStatus?.check_in ? (
                   <button
                    onClick={handleClockIn}
                    disabled={clocking}
                    className="group relative flex items-center justify-center gap-3 bg-green-500 text-white px-8 py-5 rounded-2xl shadow-lg border border-green-400 hover:bg-green-400 hover:shadow-green-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-bold text-xl min-w-[200px]"
                  >
                    {clocking ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span>Clock In</span>
                  </button>
                ) : !todayStatus?.check_out ? (
                  <button
                    onClick={handleClockOut}
                    disabled={clocking}
                    className="group relative flex items-center justify-center gap-3 bg-red-500 text-white px-8 py-5 rounded-2xl shadow-lg border border-red-400 hover:bg-red-400 hover:shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-bold text-xl min-w-[200px]"
                  >
                    {clocking ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <LogOutIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span>Clock Out</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3 bg-white/10 text-white/50 px-8 py-5 rounded-2xl shadow-inner border border-white/10 font-bold text-xl min-w-[200px]">
                     <span>Done for Today</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin & Filters Container */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Admin Controls (hide for employee) */}
          {isAdminOrHr && (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Manual Attendance Entry</h3>
                    <p className="text-xs text-gray-500 mt-1">Clock employees in or out manually.</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">Admin Only</span>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search & Select Employee</label>
                    <div className="relative border border-gray-200 rounded-lg overflow-hidden flex flex-col sm:flex-row focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search name or ID..."
                        className="w-full sm:w-1/2 pl-4 pr-4 py-2.5 bg-gray-50 border-b sm:border-b-0 sm:border-r border-gray-200 text-sm focus:outline-hidden text-black placeholder-gray-400"
                      />
                      <select
                        value={actionEmployeeId}
                        onChange={(e) => setActionEmployeeId(e.target.value)}
                        className="w-full sm:w-1/2 pl-3 pr-10 py-2.5 bg-white text-sm focus:outline-hidden appearance-none text-black cursor-pointer"
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
                  <div className="flex gap-3 w-full lg:w-auto h-[42px]">
                    <button
                      onClick={() => handleAdminClock("in")}
                      disabled={!actionEmployeeId || adminClocking}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-colors font-medium shadow-sm hover:shadow shadow-green-200"
                    >
                      <Clock className="w-4 h-4" /> Clock In
                    </button>
                    <button
                      onClick={() => handleAdminClock("out")}
                      disabled={!actionEmployeeId || adminClocking}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-red-600 px-5 rounded-lg hover:bg-red-50 hover:border-red-200 disabled:opacity-50 transition-colors font-medium"
                    >
                      <LogOutIcon className="w-4 h-4" /> Clock Out
                    </button>
                  </div>
                </div>
              </div>
              
              {selectedAdminStatus ? (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Status</span>
                    <span className={`font-semibold inline-flex items-center gap-1.5 ${!selectedAdminStatus.check_in ? 'text-gray-500' : selectedAdminStatus.check_out ? 'text-blue-600' : 'text-green-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${!selectedAdminStatus.check_in ? 'bg-gray-400' : selectedAdminStatus.check_out ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                      {!selectedAdminStatus.check_in ? "Not started" : selectedAdminStatus.check_out ? "Done for today" : "In progress"}
                    </span>
                  </div>
                  <div className="border-l border-gray-200 pl-6">
                    <span className="text-gray-500 block text-xs mb-1">Check In</span>
                    <span className="font-semibold text-gray-900">{selectedAdminStatus.check_in ? formatTime(selectedAdminStatus.check_in) : "--:--"}</span>
                  </div>
                  <div className="border-l border-gray-200 pl-6">
                    <span className="text-gray-500 block text-xs mb-1">Check Out</span>
                    <span className="font-semibold text-gray-900">{selectedAdminStatus.check_out ? formatTime(selectedAdminStatus.check_out) : "--:--"}</span>
                  </div>
                  {selectedAdminStatus.check_in && (
                    <div className="border-l border-gray-200 pl-6">
                      <span className="text-gray-500 block text-xs mb-1">Punctuality</span>
                      <span className={`font-medium ${selectedAdminStatus.is_late ? 'text-orange-600' : 'text-green-600'}`}>
                        {selectedAdminStatus.is_late ? "Late" : "On Time"}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-center text-sm text-gray-400 h-[76px]">
                  Select an employee to view their today's status
                </div>
              )}
            </div>
          )}

          {/* Confirm Admin Clock Out Modal */}
          {confirmAdminClockOut && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Clock Out</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Are you sure you want to clock out <span className="font-semibold text-gray-900">{employeeLookup[confirmAdminClockOut]?.first_name} {employeeLookup[confirmAdminClockOut]?.last_name}</span>? This action will record their shift end time now.
                  </p>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                  <button 
                    onClick={() => setConfirmAdminClockOut(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeAdminClockOut}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Yes, Clock Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick employee list for fast clocking */}
          {isAdminOrHr && (
            <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Quick Clock</h3>
                <span className="text-xs text-gray-500">Fast action</span>
              </div>
              <div className="space-y-2 overflow-y-auto pr-2 flex-1" style={{ maxHeight: 'calc(100% - 2rem)', minHeight: '300px' }}>
                {(filteredEmployees || []).map((emp) => {
                  const status = todayStatuses[emp.id];
                  const canClockIn = !status?.check_in;
                  const canClockOut = !!status?.check_in && !status?.check_out;
                  return (
                    <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm hover:bg-blue-50/20 transition-all gap-3 sm:gap-2">
                      <div className="flex justify-between w-full sm:w-auto sm:flex-col items-center sm:items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-500">{emp.employee_code}</p>
                        </div>
                        <span className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status?.check_out ? "bg-green-50 text-green-700 border-green-200" : status?.check_in ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {status?.check_out ? "Done" : status?.check_in ? "In progress" : "Not started"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <span className={`hidden sm:inline-block px-2 py-1 rounded-full text-[10px] font-semibold border ${status?.check_out ? "bg-green-50 text-green-700 border-green-200" : status?.check_in ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {status?.check_out ? "Done" : status?.check_in ? "In progress" : "Not started"}
                        </span>
                        <div className="flex gap-2">
                           <button
                             onClick={() => handleRowClock("in", emp.id)}
                             disabled={!canClockIn || adminClocking || rowClockingId === emp.id}
                             className="text-xs px-3 py-1.5 rounded-md border border-green-200 text-green-700 bg-white hover:bg-green-50 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center gap-1.5 min-w-[76px] justify-center font-medium"
                           >
                             {rowClockingId === emp.id && canClockIn ? (
                               <div className="w-3 h-3 border-2 border-green-300 border-t-green-700 rounded-full animate-spin"></div>
                             ) : "Clock In"}
                           </button>
                           <button
                             onClick={() => handleRowClock("out", emp.id)}
                             disabled={!canClockOut || adminClocking || rowClockingId === emp.id}
                             className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center gap-1.5 min-w-[84px] justify-center font-medium"
                           >
                             {rowClockingId === emp.id && canClockOut ? (
                               <div className="w-3 h-3 border-2 border-red-300 border-t-red-700 rounded-full animate-spin"></div>
                             ) : "Clock Out"}
                           </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className={`${isAdminOrHr ? 'xl:col-span-3' : 'xl:col-span-3'} bg-white rounded-2xl shadow-sm border border-gray-100 p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                 <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                 {isEmployee && (
                   <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                     Viewing Your Records
                   </span>
                 )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setFromDate(today);
                    setToDate(today);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
                    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                    setFromDate(firstDay.toISOString().split("T")[0]);
                    setToDate(lastDay.toISOString().split("T")[0]);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setFromDate(firstDay.toISOString().split("T")[0]);
                    setToDate(lastDay.toISOString().split("T")[0]);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  This Month
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black transition-all"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black transition-all"
                  />
                </div>
              </div>
              {isAdminOrHr && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Employee</label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  <th className="px-6 py-4">Hours</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdminOrHr && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-sm font-medium">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 7 : 6} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                          <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-900">No records found</p>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">We couldn't find any attendance logs matching your current filters.</p>
                        <button
                          onClick={() => {
                             const today = new Date().toISOString().split("T")[0];
                             setFromDate(today);
                             setToDate(today);
                             setPage(1);
                           }}
                           className="mt-6 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors border border-blue-200"
                        >
                          Go to Today
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendances.map((record) => {
                    const emp = record.employee || employeeLookup[record.employee_id];
                    const firstName = emp?.first_name || "Unknown";
                    const lastName = emp?.last_name || "";
                    const empCode = (emp as any)?.employee_code || "";

                    // Calculate slightly late (if late and check_in is just a few minutes passed 08:00, or whatever. We guess based on time but let's just use strict late flag for simplicity or provide a slightly late visual if there is data on it.
                    // For now strict late vs on time.
                    
                    return (
                    <tr key={record.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-xs">
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
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {record.total_hours ? record.total_hours.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            record.is_late
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${record.is_late ? "bg-red-500" : "bg-green-500"}`}></span>
                          {record.is_late ? "Late" : "On Time"}
                        </span>
                      </td>
                      {isAdminOrHr && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleRowClock("in", record.employee_id)}
                              disabled={!!todayStatuses[record.employee_id]?.check_in}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                              title="Clock In"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setActionEmployeeId(record.employee_id.toString());
                                setConfirmAdminClockOut(record.employee_id);
                              }}
                              disabled={!todayStatuses[record.employee_id]?.check_in || !!todayStatuses[record.employee_id]?.check_out}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:ring-2 focus:ring-red-500 focus:outline-hidden"
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
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <p>
                Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <label htmlFor="pageSize">Items per page:</label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
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







