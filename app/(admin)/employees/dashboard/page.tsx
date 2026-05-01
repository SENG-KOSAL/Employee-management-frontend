"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import {
  Users,
  Briefcase,
  Building2,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Link from "next/link";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position: string;
  status: string;
  employee_code: string;
  created_at?: string;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/employees?per_page=1000");
      const list = res.data?.data || res.data || [];
      const rows = Array.isArray(list) ? list : list.data || [];
      setEmployees(rows);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  // derived stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => (e.status || "").toLowerCase() === 'active').length;
    const inactive = total - active;
    
    // Departments
    const deptMap: Record<string, number> = {};
    employees.forEach(e => {
        const d = e.department || "Unassigned";
        deptMap[d] = (deptMap[d] || 0) + 1;
    });
    
    // Positions
    const posMap: Record<string, number> = {};
    employees.forEach(e => {
        const p = e.position || "Unassigned";
        posMap[p] = (posMap[p] || 0) + 1;
    });

    return { total, active, inactive, deptMap, posMap };
  }, [employees]);

  // Chart Data Preparation
  const deptData = Object.entries(stats.deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8

  const posData = Object.entries(stats.posMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8

  const statusData = [
    { name: 'Active', value: stats.active, color: '#10B981' },
    { name: 'Inactive', value: stats.inactive, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Recent Employees
  const recentEmployees = [...employees]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, bgClass, textClass, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon className={`w-6 h-6 ${textClass}`} />
      </div>
    </div>
  );

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto p-2">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Dashboard</h1>
            <p className="text-gray-500">Workforce overview and metrics</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </button>
             <Link href="/employees/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
                Add New Employee
             </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                title="Total Employees" 
                value={stats.total} 
                icon={Users}
                bgClass="bg-blue-50"
                textClass="text-blue-600"
                subtext="Registered staff"
            />
             <StatCard 
                title="Active" 
                value={stats.active}
                icon={UserCheck}
                bgClass="bg-green-50"
                textClass="text-green-600"
                subtext="Current status"
            />
             <StatCard 
                title="Incative / On-Leave" 
                value={stats.inactive}
                icon={UserX}
                bgClass="bg-red-50"
                textClass="text-red-600"
                subtext="Not active"
            />
             <StatCard 
                title="Departments" 
                value={Object.keys(stats.deptMap).length}
                icon={Building2}
                bgClass="bg-purple-50"
                textClass="text-purple-600"
                subtext="Organizational units"
            />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Department Distribution */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Department Overview</h3>
                        <p className="text-sm text-gray-500">Employees per department</p>
                    </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120}
                                tick={{ fill: '#4B5563', fontSize: 12 }}
                            />
                            <Tooltip 
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} name="Employees" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Employment Status</h3>
                    <p className="text-sm text-gray-500">Active vs Inactive Ratio</p>
                </div>
                <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                       <div className="text-center">
                            <span className="text-3xl font-bold text-gray-900">{Math.round((stats.active/stats.total || 0)*100)}%</span>
                            <p className="text-xs text-gray-500">Active</p>
                       </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts Row 2 & Recent List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Role Distribution */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Roles Breakdown</h3>
                    <p className="text-sm text-gray-500">Top job titles by headcount</p>
                </div>
                <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={posData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fill: '#6B7280', fontSize: 11 }} 
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                            />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={32} name="Employees" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Employees List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Recently Added</h3>
                        <p className="text-sm text-gray-500">Newest team members</p>
                    </div>
                    <Link href="/employees" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Dept</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {emp.first_name[0]}{emp.last_name[0]}
                                            </div>
                                            <div>
                                                <div>{emp.first_name} {emp.last_name}</div>
                                                <div className="text-xs text-gray-400">{emp.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{emp.position || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {emp.department || 'General'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentEmployees.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No employees found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </HRMSSidebar>
  );
}
