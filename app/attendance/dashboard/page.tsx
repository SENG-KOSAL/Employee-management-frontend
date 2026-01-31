"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import {
  Users,
  Clock,
  CalendarCheck,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Download,
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
  AreaChart,
  Area,
} from "recharts";

interface AttendanceRecord {
  id: number;
  employee_id: number;
  check_in: string | null;
  check_out: string | null;
  date: string;
  is_late: boolean;
  status: string; // e.g. "present", "absent", "leave" (inferred)
}

interface Employee {
  id: number;
  // ... other fields
}

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Employees Count
      const empRes = await api.get("/api/v1/employees?per_page=1");
      const totalEmployees = empRes.data?.meta?.total || empRes.data?.total || 0;

      // 2. Fetch Today's Attendance
      const today = new Date().toISOString().split("T")[0];
      const todayRes = await api.get(`/api/v1/attendances?from=${today}&to=${today}&per_page=1000`);
      const todayRecords: AttendanceRecord[] = todayRes.data?.data || todayRes.data || [];

      // Calculate Today's Stats
      const presentToday = todayRecords.filter((r) => r.check_in).length;
      const lateToday = todayRecords.filter((r) => r.is_late).length;
      
      // Assumption: We might need a separate call for leaves, or infer from absence if we had full roster.
      // For now, let's fetch leaves for today if possible, or just use 0.
      // Let's try fetching approved leaves overlapping today.
      let onLeaveToday = 0;
      try {
        const leaveRes = await api.get(`/api/v1/leave-requests?status=approved&date=${today}`);
        const leaves = leaveRes.data?.data || leaveRes.data || [];
        // Simple client-side check if date param isn't supported perfectly by API yet
        onLeaveToday = leaves.filter((l: any) => l.start_date <= today && l.end_date >= today).length;
      } catch (err) {
        console.warn("Could not fetch leaves", err);
      }

      setStats({
        totalEmployees,
        presentToday,
        lateToday,
        onLeaveToday,
      });

      // 3. Fetch Trend Data (Last 7 Days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
      
      const fromStr = startDate.toISOString().split("T")[0];
      const toStr = endDate.toISOString().split("T")[0];

      const trendRes = await api.get(`/api/v1/attendances?from=${fromStr}&to=${toStr}&per_page=1000`);
      const trendRecords: AttendanceRecord[] = trendRes.data?.data || trendRes.data || [];

      // Group by date
      const dateMap: Record<string, { date: string; present: number; late: number }> = {};
      
      // Initialize map with all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dStr = d.toISOString().split("T")[0];
        dateMap[dStr] = { date: d.toLocaleDateString('en-US', { weekday: 'short' }), present: 0, late: 0 };
      }

      trendRecords.forEach(rec => {
        const dStr = rec.date; 
        if (dateMap[dStr]) {
            if (rec.check_in) dateMap[dStr].present++;
            if (rec.is_late) dateMap[dStr].late++;
        }
      });

      setTrendData(Object.values(dateMap));

      // 4. Distribution Chart (Today)
      const distribution = [
        { name: 'On Time', value: presentToday - lateToday, color: '#10B981' },
        { name: 'Late', value: lateToday, color: '#F59E0B' },
        { name: 'On Leave', value: onLeaveToday, color: '#3B82F6' },
        { name: 'Absent', value: Math.max(0, totalEmployees - presentToday - onLeaveToday), color: '#EF4444' },
      ].filter(d => d.value > 0);

      setStatusDistribution(distribution);

    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );

  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-7xl mx-auto p-2">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Dashboard</h1>
            <p className="text-gray-500">Overview of employee attendance and activity</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={loadDashboardData}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
            >
                Refresh
            </button>
             <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Report
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                title="Total Employees" 
                value={stats.totalEmployees} 
                subtext="Active workforce"
                icon={Users}
                color="bg-blue-500"
            />
             <StatCard 
                title="Present Today" 
                value={stats.presentToday}
                subtext={`${stats.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% Attendance`}
                icon={CalendarCheck}
                color="bg-green-500"
            />
             <StatCard 
                title="Late Arrivals" 
                value={stats.lateToday}
                subtext="Check-ins after start time"
                icon={Clock}
                color="bg-amber-500"
            />
             <StatCard 
                title="On Leave" 
                value={stats.onLeaveToday}
                subtext="Approved leave requests"
                icon={Briefcase}
                color="bg-indigo-500"
            />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Weekly Attendance Trend</h3>
                    <p className="text-sm text-gray-500">Present vs Late over the last 7 days</p>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="present" 
                                name="Present"
                                stroke="#10B981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorPresent)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="late" 
                                name="Late"
                                stroke="#F59E0B" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorLate)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Today's Status</h3>
                    <p className="text-sm text-gray-500">Distribution of workforce status</p>
                </div>
                <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                       <div className="text-center">
                            <span className="text-3xl font-bold text-gray-900">{stats.presentToday}</span>
                            <p className="text-xs text-gray-500">Present</p>
                       </div>
                    </div>
                </div>
                 <div className="space-y-3 mt-4">
                    {statusDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-gray-600">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>

      </div>
    </HRMSSidebar>
  );
}
