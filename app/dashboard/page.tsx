"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken, removeToken } from "@/utils/auth";
import {
  Users,
  Clock,
  Calendar,
  FileText,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { fetchMe } from "@/lib/meCache";

function formatTime(date: string) {
  const now = new Date();
  const time = new Date(date);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string | null } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  // Load once; use the Refresh button when needed.
  const { stats, loading: loadingStats, error: statsError, refetch } = useDashboardStats();
  const { activities, loading: loadingActivities } = useRecentActivity();

  // Mock data for charts
  const attendanceData = [
    { name: "Mon", present: 42, absent: 3, late: 2 },
    { name: "Tue", present: 45, absent: 1, late: 1 },
    { name: "Wed", present: 43, absent: 2, late: 4 },
    { name: "Thu", present: 46, absent: 0, late: 3 },
    { name: "Fri", present: 41, absent: 5, late: 2 },
  ];

  const employeeGrowthData = [
    { month: "Aug", employees: 24 },
    { month: "Sep", employees: 28 },
    { month: "Oct", employees: 35 },
    { month: "Nov", employees: 42 },
    { month: "Dec", employees: 48 },
    { month: "Jan", employees: 52 },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          router.push("/auth/login");
          return;
        }

        const isTenantHost = () => {
          if (typeof window === "undefined") return false;
          const host = window.location.hostname;
          if (!host || host === "localhost" || host === "127.0.0.1") return false;

          const parts = host.split(".").filter(Boolean);
          if (parts.length < 2) return false;

          const sub = parts[0]?.toLowerCase();
          if (!sub || sub === "platform" || sub === "app" || sub === "www") return false;
          return true;
        };

        const me = await fetchMe(false, { ttlMs: 5 * 60 * 1000 });
        if (me) {
          const meObj = me as unknown as Record<string, unknown>;
          const employeeObj = (meObj.employee && typeof meObj.employee === "object" ? (meObj.employee as Record<string, unknown>) : null);
          const roleRaw = (employeeObj?.role ?? meObj.role ?? "") as unknown;
          const role = String(typeof roleRaw === "string" ? roleRaw : "").toLowerCase();
          if (role === "super_admin") {
            const activeCompanyId = typeof window !== "undefined" ? window.localStorage.getItem("active_company_id") : null;
            // On the platform host, super_admin must select an active company.
            // On tenant subdomains, allow super_admin to use the admin dashboard.
            if (!activeCompanyId && !isTenantHost()) {
              router.replace("/super-admin");
              return;
            }
          }
          setUser({ name: me.name ?? null });
        } else {
          // Fallback if backend returns something unexpected
          const res = await api.get("/me");
          const data = (res.data?.data ?? res.data ?? null) as unknown;
          if (data && typeof data === "object") {
            const rec = data as Record<string, unknown>;
            setUser({ name: typeof rec.name === "string" ? rec.name : null });
          }
        }
        setLoadingUser(false);
      } catch (err) {
        console.error("User fetch error:", err);
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      removeToken();
      router.push("/auth/login");
    }
  };

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      borderColor: "border-blue-200",
      href: "/employees",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: Users,
      color: "bg-green-50 text-green-600",
      borderColor: "border-green-200",
      href: "/attendance",
    },
    {
      label: "On Leave",
      value: stats.onLeave,
      icon: Calendar,
      color: "bg-amber-50 text-amber-600",
      borderColor: "border-amber-200",
      href: "/leave-requests",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: Clock,
      color: "bg-purple-50 text-purple-600",
      borderColor: "border-purple-200",
      href: "/leave-requests",
    },
  ];

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-7xl">
        {statsError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {statsError}
          </div>
        )}

        {/* Header with Welcome & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Admin Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">Welcome backkkkkkk, {user?.name || "Admin"}! 👋</h1>
            <p className="text-gray-600 mt-1">Real-time overview of your organization</p>
          </div>
          <button
            onClick={refetch}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <button
                key={idx}
                onClick={() => router.push(stat.href)}
                className={`group text-left bg-white rounded-2xl border ${stat.borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-6 cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingStats ? (
                    <span className="text-lg text-gray-400">Loading...</span>
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Attendance</h3>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7280", fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7280", fontSize: 12 }} 
                  />
                  <RechartsTooltip 
                    cursor={{ fill: "#F3F4F6" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Present" barSize={32} />
                  <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" barSize={32} />
                  <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Employee Growth</h3>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={employeeGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7280", fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7280", fontSize: 12 }} 
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="employees" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                    name="Total Employees" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/leave-requests/create")}
            className="group bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 hover:shadow-lg transition-all"
          >
            <Calendar className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-lg">Create Leave Request</h3>
            <p className="text-blue-100 text-sm mt-1">Submit leave on behalf</p>
          </button>
          <button
            onClick={() => router.push("/payroll")}
            className="group bg-linear-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 hover:shadow-lg transition-all"
          >
            <FileText className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-lg">Manage Payroll</h3>
            <p className="text-green-100 text-sm mt-1">Generate and track runs</p>
          </button>
          <button
            onClick={() => router.push("/employees")}
            className="group bg-linear-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 hover:shadow-lg transition-all"
          >
            <Users className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-lg">View Employees</h3>
            <p className="text-purple-100 text-sm mt-1">Manage team members</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <p className="text-xs text-gray-500 mt-1">Latest updates from your organization</p>
            </div>
            <button
              onClick={() => router.push("/leave-requests")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {loadingActivities ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No recent activity</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">{activity.action}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{activity.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Status */}
        <div className="text-center text-xs text-gray-500">
          <p>Dashboard updates every 30 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </HRMSSidebar>
  );
}