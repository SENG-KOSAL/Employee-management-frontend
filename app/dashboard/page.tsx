"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken, removeToken } from "@/utils/auth";
import {
  Users,
  Clock,
  LogOut,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          router.push("/auth/login");
          return;
        }

        const res = await api.get("/me");
        setUser(res.data.data || res.data);
        setLoading(false);
      } catch (err) {
        // Avoid immediate redirect; show error to prevent loop
        setError("Failed to load user data. Please ensure the API is reachable and you are authenticated.");
        setLoading(false);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8">
          <h2 className="text-3xl font-bold">Welcome back, {user?.name || "Admin"}! 👋</h2>
          <p className="text-blue-100 mt-2">
            Here's what's happening with your team today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Total Employees",
              value: "1,284",
              icon: Users,
              color: "bg-blue-50 text-blue-600",
              trend: "+12%",
              trending: "up",
            },
            {
              label: "Present Today",
              value: "1,156",
              icon: Users,
              color: "bg-green-50 text-green-600",
              trend: "+3%",
              trending: "up",
            },
            {
              label: "On Leave",
              value: "42",
              icon: Clock,
              color: "bg-amber-50 text-amber-600",
              trend: "-8%",
              trending: "down",
            },
            {
              label: "Pending Requests",
              value: "18",
              icon: Clock,
              color: "bg-purple-50 text-purple-600",
              trend: "+5%",
              trending: "up",
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trending === "up" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {stat.trend}
                    {stat.trending === "up" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                  </div>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { action: "Leave approved", employee: "Sarah Johnson", time: "2 min ago" },
              { action: "New employee added", employee: "Michael Chen", time: "15 min ago" },
              { action: "Payroll processed", employee: "Finance Team", time: "1 hour ago" },
              { action: "Performance review", employee: "Emily Davis", time: "2 hours ago" },
              { action: "Department updated", employee: "Engineering", time: "3 hours ago" },
            ].map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.employee}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HRMSSidebar>
  );
}
