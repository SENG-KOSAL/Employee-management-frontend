"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { Calendar, Clock } from "lucide-react";

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
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  };
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
}

export default function ManagerAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
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
      const haystack = [emp.first_name, emp.last_name, emp.employee_code].filter(Boolean).join(" ").toLowerCase();
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
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchEmployees();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAttendances();
  }, [page, fromDate, toDate, employeeFilter]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/v1/me");
      const data = res.data?.data ?? res.data;
      if (data?.role !== "manager" && data?.role !== "admin" && data?.role !== "hr") {
        router.push("/attendance");
        return;
      }
      setUser(data);
    } catch (err) {
      console.error(err);
      router.push("/auth/login");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/api/v1/employees?per_page=200");
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setEmployees(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load employees");
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (employeeFilter) params.append("employee_id", employeeFilter);
      const res = await api.get(`/api/v1/attendances?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const items = Array.isArray(data) ? data : data?.data ?? [];
      const enriched = items.map((item: AttendanceRecord) => {
        if (!item.employee && employeeLookup[item.employee_id]) {
          const emp = employeeLookup[item.employee_id];
          return {
            ...item,
            employee: {
              first_name: emp.first_name,
              last_name: emp.last_name,
              employee_code: emp.employee_code,
            },
          };
        }
        return item;
      });
      setAttendances(enriched);
      if (Array.isArray(data)) setTotalPages(1);
      else setTotalPages((data?.last_page as number) || data?.meta?.last_page || 1);
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

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Attendance</h1>
            <p className="text-gray-500 mt-1 text-sm">Review your team's attendance records.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To</label>
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
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employee"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  <select
                    value={employeeFilter}
                    onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="">All employees</option>
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} {emp.employee_code ? `• ${emp.employee_code}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current filters</p>
                <p className="text-lg font-semibold text-gray-900">{employeeFilter ? "Filtered" : "All team"}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Managers can view team attendance only.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900">Attendance Records</h3>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading records...</td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                      <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
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
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{formatTime(record.check_in)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{formatTime(record.check_out)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              record.is_late ? "bg-red-50 text-red-700 border-red-100" : "bg-green-50 text-green-700 border-green-100"
                            }`}
                          >
                            {record.is_late ? "Late" : "On Time"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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
