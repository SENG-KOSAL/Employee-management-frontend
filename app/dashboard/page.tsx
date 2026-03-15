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
      <div className="max-w-[1400px] mx-auto space-y-8 py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
        {statsError && (
          <div className="p-4 bg-rose-50/80 backdrop-blur-sm border-l-4 border-rose-500 rounded-r-2xl text-rose-800 text-sm flex items-center gap-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="font-medium text-base">{statsError}</span>
          </div>
        )}

        {/* Animated & Colorful Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-500 rounded-[2rem] p-8 sm:p-10 text-white shadow-xl shadow-indigo-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <p className="text-xs font-bold text-indigo-50 uppercase tracking-widest">Admin Dashboard</p>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
                Welcome back, {user?.name || "Admin"}! <span className="inline-block animate-bounce origin-bottom hover:animate-none">👋</span>
              </h1>
              <p className="text-indigo-100/90 text-lg sm:text-xl font-medium max-w-2xl mt-3">
                Here is the real-time overview of your organization today.
              </p>
            </div>
            <button
              onClick={refetch}
              disabled={loadingStats}
              className="group self-start md:self-center inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-sm transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${loadingStats ? "animate-spin" : ""}`} />
              {loadingStats ? "Refreshing..." : "Refresh Stats"}
            </button>
          </div>
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
          <div className="absolute -bottom-24 right-40 w-96 h-96 bg-purple-400 opacity-20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full blur-3xl mix-blend-screen pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            // Map colors to vibrant gradient variants
            const colorMap = {
              "bg-blue-50 text-blue-600": { bg: "bg-blue-500", text: "text-blue-500", glow: "shadow-blue-500/20" },
              "bg-green-50 text-green-600": { bg: "bg-emerald-500", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
              "bg-amber-50 text-amber-600": { bg: "bg-amber-500", text: "text-amber-500", glow: "shadow-amber-500/20" },
              "bg-purple-50 text-purple-600": { bg: "bg-violet-500", text: "text-violet-500", glow: "shadow-violet-500/20" }
            };
            const mappedColor = colorMap[stat.color as keyof typeof colorMap] || colorMap["bg-blue-50 text-blue-600"];

            return (
              <button
                key={idx}
                onClick={() => router.push(stat.href)}
                className="group relative text-left bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-100 group-hover:opacity-0 transition-opacity duration-300`}></div>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-${mappedColor.bg.replace("bg-", "")} to-slate-50 transition-opacity duration-300 pointer-events-none`}></div>
                
                <div className="relative z-10 flex items-start justify-between mb-6">
                  <div className={`p-4 rounded-2xl bg-white shadow-md ${mappedColor.glow} ring-1 ring-slate-100 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${mappedColor.text}`} />
                  </div>
                  <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
                
                <div className="relative z-10">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
                  <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                    {loadingStats ? (
                      <span className="inline-block w-16 h-10 bg-slate-200 rounded animate-pulse"></span>
                    ) : (
                      stat.value.toLocaleString()
                    )}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-2 h-6 rounded-full bg-blue-500"></span>
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

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-2 h-6 rounded-full bg-violet-500"></span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => router.push("/leave-requests/create")}
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-[2rem] p-8 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar className="w-32 h-32 -mt-12 -mr-12 transform rotate-12 group-hover:rotate-6 transition-transform duration-500" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 shadow-inner">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight">Leave Request</h3>
              <p className="text-blue-100 text-sm mt-2 font-medium">Submit leave on behalf</p>
            </div>
          </button>
          
          <button
            onClick={() => router.push("/payroll")}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-[2rem] p-8 hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-32 h-32 -mt-12 -mr-12 transform rotate-12 group-hover:rotate-6 transition-transform duration-500" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 shadow-inner">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight">Manage Payroll</h3>
              <p className="text-green-100 text-sm mt-2 font-medium">Generate and track runs</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/employees")}
            className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-[2rem] p-8 hover:shadow-xl hover:shadow-violet-500/20 hover:-translate-y-1 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-32 h-32 -mt-12 -mr-12 transform rotate-12 group-hover:rotate-6 transition-transform duration-500" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 shadow-inner">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight">View Employees</h3>
              <p className="text-purple-100 text-sm mt-2 font-medium">Manage team members</p>
            </div>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Recent Activity</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Latest updates from your organization</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/leave-requests")}
              className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100/80">
            {loadingActivities ? (
              <div className="px-8 py-16 flex flex-col items-center justify-center gap-4 text-slate-500">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div>
                <p className="font-bold text-sm uppercase tracking-widest animate-pulse">Loading Activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="px-8 py-16 text-center text-slate-500 font-medium">No recent activity found.</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="px-8 py-5 hover:bg-indigo-50/40 transition-colors group cursor-pointer">
                  <div className="flex items-start gap-5">
                    <div className="text-3xl p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all">{activity.icon}</div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-extrabold text-slate-800 text-base truncate group-hover:text-indigo-700 transition-colors">{activity.action}</p>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-full">{formatTime(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1.5 truncate font-medium">{activity.description}</p>
                    </div>
                    <div className="flex items-center justify-center h-12">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Status */}
        <div className="text-center text-sm font-medium text-slate-400 py-4 flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Dashboard syncs automatically • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </HRMSSidebar>
  );
}