"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { RefreshCw, Search, Eye } from "lucide-react";

interface SalaryRow {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string;
  position?: string;
  employee_code?: string;
  salary?: number;
  status?: string;
}

const currency = (value?: number | string) => {
  if (value === undefined || value === null) return "$0";
  const num = typeof value === "string" ? parseFloat(value || "0") : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0);
};

export default function SalariesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/employees?per_page=500");
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load salaries");
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.department) s.add(r.department); });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const deptTerm = dept.trim().toLowerCase();
    return rows.filter((r) => {
      const name = `${r.full_name || ""} ${r.first_name || ""} ${r.last_name || ""}`.toLowerCase();
      const code = (r.employee_code || "").toLowerCase();
      const deptName = (r.department || "").toLowerCase();
      const matchesSearch = term ? name.includes(term) || code.includes(term) : true;
      const matchesDept = deptTerm ? deptName === deptTerm : true;
      return matchesSearch && matchesDept;
    });
  }, [rows, search, dept]);

  const totals = useMemo(() => {
    const headcount = filtered.length;
    const monthly = filtered.reduce((acc, r) => acc + Number(r.salary || 0), 0);
    const yearly = monthly * 12;
    return { headcount, monthly, yearly };
  }, [filtered]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Salaries</h1>
            <p className="text-sm text-gray-500">Review fixed salaries by employee.</p>
          </div>
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Headcount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.headcount}</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
            <p className="text-xs text-gray-700 uppercase font-semibold">Monthly salary total</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{currency(totals.monthly)}</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl shadow-sm">
            <p className="text-xs text-green-700 uppercase font-semibold">Annualized</p>
            <p className="text-xl font-bold text-green-900 mt-1">{currency(totals.yearly)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code"
                className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end text-xs text-gray-500">Totals update with filters.</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">Salary table</div>
            <div className="text-xs text-gray-500">Base salaries by employee</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.full_name || `${r.first_name || ""} ${r.last_name || ""}`}</div>
                        <div className="text-xs text-gray-500">{r.employee_code || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.department || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{r.position || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{r.status || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{currency(r.salary)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/employees/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>
        )}
      </div>
    </HRMSSidebar>
  );
}
