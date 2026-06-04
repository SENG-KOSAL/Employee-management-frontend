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
import { isPlatformAdminRole, normalizeRole } from "@/lib/roles";

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

        const me = await fetchMe(false, { ttlMs: 5 * 60 * 1000 });
        if (me) {
          const meObj = me as unknown as Record<string, unknown>;
          const employeeObj = (meObj.employee && typeof meObj.employee === "object" ? (meObj.employee as Record<string, unknown>) : null);
          const roleRaw = (employeeObj?.role ?? meObj.role ?? "") as unknown;
          const role = normalizeRole(typeof roleRaw === "string" ? roleRaw : "");
          if (isPlatformAdminRole(role)) {
            const activeCompanyId = typeof window !== "undefined" ? window.localStorage.getItem("active_company_id") : null;
            // Platform admins should only be on tenant dashboards when explicitly in support mode.
            if (!activeCompanyId) {
              router.replace("/super-admin/dashboard");
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
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {statsError && (
          <div className="p-4 bg-rose-50/80 backdrop-blur-sm border-l-4 border-rose-500 rounded-r-2xl text-rose-800 text-sm flex items-center gap-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="font-medium text-base">{statsError}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Welcome, Admin
            </h1>
          </div>
          <button
            onClick={refetch}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
            {loadingStats ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            const borderClasses = stat.borderColor;

            return (
              <button
                key={idx}
                onClick={() => router.push(stat.href)}
                className={`cursor-pointer rounded-xl border ${borderClasses} bg-white p-5 text-left shadow-sm transition-all hover:shadow-md sm:p-5`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">
                      {loadingStats ? (
                        <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-200"></span>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              Weekly Attendance
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600 }} 
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600 }} 
                    dx={-10}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", padding: "12px", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "24px", fontWeight: "bold", fontSize: "14px", color: "#475569" }} />
                  <Bar dataKey="present" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Present" barSize={36} />
                  <Bar dataKey="absent" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Absent" barSize={36} />
                  <Bar dataKey="late" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Late" barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              Employee Growth
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={employeeGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600 }} 
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600 }} 
                    dx={-10}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", padding: "12px", fontWeight: "bold" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="employees" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 3, stroke: "#fff" }} 
                    activeDot={{ r: 8, strokeWidth: 0 }} 
                    name="Total Employees" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Quick:</span>
          <button
            onClick={() => router.push("/leave-requests/create")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
          >
            <Calendar className="h-4 w-4" />
            Leave Request
          </button>
          <button
            onClick={() => router.push("/payroll")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
          >
            <FileText className="h-4 w-4" />
            Payroll
          </button>
          <button
            onClick={() => router.push("/employees")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
          >
            <Users className="h-4 w-4" />
            Employees
          </button>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Clock className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
              </div>
            </div>
            <button
              onClick={() => router.push("/leave-requests")}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100/80">
            {loadingActivities ? (
              <div className="flex items-center justify-center gap-3 px-6 py-12 text-slate-400">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
                <p className="text-sm font-semibold">Loading activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">No recent activity found.</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-slate-50 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base shrink-0">{activity.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800 truncate">{activity.action}</p>
                      <span className="shrink-0 text-xs font-medium text-slate-400">{formatTime(activity.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 self-center shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Status */}
        <div className="text-center text-xs text-slate-400 py-4">
          Data refreshes automatically
        </div>
      </div>
    </HRMSSidebar>
  );
}