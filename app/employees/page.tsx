"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
  employee_code: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    fetchEmployees();
    // We intentionally fetch once; search/pagination happen client-side to avoid extra API calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ per_page: "500" });
      const res = await api.get(`/api/v1/employees?${params.toString()}`);
      const data = res.data.data || res.data;
      
      const normalizeAndSort = (list: Employee[]) =>
        [...list].sort((a, b) => {
          const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
          const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });

      if (Array.isArray(data)) {
        setEmployees(normalizeAndSort(data));
      } else {
        const rows = Array.isArray(data.data) ? data.data : [];
        setEmployees(normalizeAndSort(rows));
      }
      setError("");
    } catch (err) {
      setError("Failed to load employees");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // This is now handled on the dedicated create page
    } catch (err) {
      setError("Failed to create employee");
      console.error(err);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await api.delete(`/api/v1/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      setError("Failed to delete employee");
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      emp.employee_code?.toLowerCase().includes(term) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your employees, roles, and permissions.</p>
          </div>
          <Link
            href="/employees/create"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-medium group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Add New Employee
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent border-none text-sm font-semibold text-gray-900 focus:ring-0 cursor-pointer p-0 pr-6"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 font-medium px-2">
              Total: <span className="text-gray-900">{filteredEmployees.length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading team members...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No employees found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or add a new employee.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Role & Dept</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
                              {emp.first_name?.[0]}{emp.last_name?.[0]}
                            </div>
                            <div>
                              <Link href={`/employees/${emp.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                {emp.first_name} {emp.last_name}
                              </Link>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{emp.employee_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{emp.position || "No Position"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{emp.department || "No Dept"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{emp.email}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{emp.phone || "-"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              emp.status === "active"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-gray-50 text-gray-600 border-gray-100"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              emp.status === "active" ? "bg-green-500" : "bg-gray-400"
                            }`}></span>
                            {emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/employees/${emp.id}/edit`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </HRMSSidebar>
  );
}

