"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { departmentsService } from "@/services/departments";
import type { Department } from "@/types/hr";
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown, Download, Upload, X, Filter } from "lucide-react";
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
  photo_url?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  image_url?: string | null;
  photo?: string | null;
  avatar?: string | null;
  user?: {
    photo_url?: string | null;
    avatar_url?: string | null;
    profile_photo_url?: string | null;
  } | null;
}

interface ImportErrorItem {
  row: number;
  messages: string[];
}

interface ImportResult {
  success_count: number;
  failed_count: number;
  errors: ImportErrorItem[];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [brokenPhotos, setBrokenPhotos] = useState<Record<number, boolean>>({});
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const msg =
      (err as any)?.response?.data?.message ||
      (err as any)?.message;
    return typeof msg === "string" && msg.trim() ? msg : fallback;
  };

  const resolveEmployeePhotoUrl = (emp: Employee): string | null => {
    const raw =
      emp.photo_url ||
      emp.avatar_url ||
      emp.profile_photo_url ||
      emp.image_url ||
      emp.photo ||
      emp.avatar ||
      emp.user?.photo_url ||
      emp.user?.avatar_url ||
      emp.user?.profile_photo_url;

    if (!raw) return null;
    const url = String(raw).trim();
    if (!url) return null;
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    if (/^(https?:)?\/\//i.test(url)) return url;

    const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    if (!base) return url;
    if (url.startsWith("/")) return `${base}${url}`;
    return `${base}/${url}`;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    fetchEmployees();
    fetchDepartments();
    // We intentionally fetch once; search/pagination happen client-side to avoid extra API calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentsService.list();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

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
    } catch (err: unknown) {
      try {
        // Fallback for backends that expect method override.
        await api.post(`/api/v1/employees/${id}`, { _method: "DELETE" });
        setEmployees((prev) => prev.filter((emp) => emp.id !== id));
        return;
      } catch (overrideErr: unknown) {
        try {
          // Additional fallback used in some Laravel projects.
          await api.post(`/api/v1/employees/${id}/delete`);
          setEmployees((prev) => prev.filter((emp) => emp.id !== id));
          return;
        } catch (finalErr: unknown) {
          setError(getApiErrorMessage(finalErr, getApiErrorMessage(overrideErr, getApiErrorMessage(err, "Failed to delete employee"))));
          console.error(err);
          console.error(overrideErr);
          console.error(finalErr);
        }
      }
    }
  };

  const getFileNameFromContentDisposition = (headerValue?: string): string => {
    if (!headerValue) return "employee-import-template.xlsx";
    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const simpleMatch = headerValue.match(/filename="?([^";]+)"?/i);
    if (simpleMatch?.[1]) return simpleMatch[1];
    return "employee-import-template.xlsx";
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await api.get("/api/v1/admin/employees/template", {
        responseType: "blob",
      });

      const fileName = getFileNameFromContentDisposition(response.headers?.["content-disposition"]);
      const blob = new Blob([response.data], {
        type:
          response.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to download template"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError("Please choose an .xlsx file.");
      return;
    }

    try {
      setImporting(true);
      setImportError("");
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await api.post("/api/v1/admin/employees/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const payload = res.data?.data || res.data || {};
      const normalizedResult: ImportResult = {
        success_count: Number(payload.success_count || 0),
        failed_count: Number(payload.failed_count || 0),
        errors: Array.isArray(payload.errors)
          ? payload.errors.map((item: any) => ({
              row: Number(item?.row || 0),
              messages: Array.isArray(item?.messages)
                ? item.messages.map((m: unknown) => String(m))
                : [],
            }))
          : [],
      };

      setImportResult(normalizedResult);
      await fetchEmployees();
    } catch (err) {
      setImportError(getApiErrorMessage(err, "Failed to import employees"));
    } finally {
      setImporting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || (
      emp.employee_code?.toLowerCase().includes(term) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term)
    );
    const matchesDept = !selectedDepartment || emp.department === selectedDepartment;

    return matchesSearch && matchesDept;
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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/employees/create"
              className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </Link>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {downloadingTemplate ? "Downloading..." : "Download Template"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportError("");
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              Import Employees
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full sm:max-w-2xl">
            <div className="relative flex-1 w-full">
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
            
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-gray-900 appearance-none cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
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
                            {(() => {
                              const photoUrl = resolveEmployeePhotoUrl(emp);
                              const initials = `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}`
                                .trim()
                                .toUpperCase() || "?";
                              const showPhoto = Boolean(photoUrl) && !brokenPhotos[emp.id];
                              return (
                                <div className="w-10 h-10 rounded-full shadow-sm overflow-hidden bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                  {showPhoto ? (
                                    <img
                                      src={photoUrl as string}
                                      alt={`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee photo"}
                                      className="w-full h-full object-cover"
                                      onError={() =>
                                        setBrokenPhotos((prev) => ({
                                          ...prev,
                                          [emp.id]: true,
                                        }))
                                      }
                                    />
                                  ) : (
                                    <span className="text-blue-700 font-bold text-sm">{initials}</span>
                                  )}
                                </div>
                              );
                            })()}
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
                              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
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
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Employees</h3>
                <p className="text-sm text-gray-500">Upload Excel (.xlsx) file to bulk create employees.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportEmployees} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Excel file</label>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                    setImportResult(null);
                    setImportError("");
                  }}
                  className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {importError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={importing}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? "Importing..." : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {importResult && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Import Result</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                      <p className="text-xs text-green-700 font-semibold uppercase">Success Count</p>
                      <p className="text-xl font-bold text-green-700">{importResult.success_count}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                      <p className="text-xs text-amber-700 font-semibold uppercase">Failed Count</p>
                      <p className="text-xl font-bold text-amber-700">{importResult.failed_count}</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="rounded-lg border border-red-100 bg-white p-3">
                      <p className="text-sm font-semibold text-red-700 mb-2">Row Errors</p>
                      <ul className="space-y-1 text-sm text-red-700 max-h-52 overflow-auto pr-1">
                        {importResult.errors.map((item, idx) => (
                          <li key={`${item.row}-${idx}`}>
                            Row {item.row}: {item.messages.join(", ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </HRMSSidebar>
  );
}

