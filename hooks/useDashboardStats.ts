import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingRequests: number;
  totalPayroll: number;
  departmentCount: number;
}

const STORAGE_KEY = "hrms.dashboardStats.v1";

type StoredStats = {
  ts: number;
  value: DashboardStats;
};

const readStored = (): StoredStats | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.ts !== "number" || !rec.value || typeof rec.value !== "object") return null;
    return { ts: rec.ts, value: rec.value as DashboardStats };
  } catch {
    return null;
  }
};

const writeStored = (value: DashboardStats) => {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredStats = { ts: Date.now(), value };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const isFresh = (ts: number, ttlMs: number) => Date.now() - ts < ttlMs;

export function useDashboardStats(refreshInterval = 0, ttlMs = 5 * 60 * 1000) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingRequests: 0,
    totalPayroll: 0,
    departmentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setError("");
      const today = new Date().toISOString().slice(0, 10);
      
      // Use Promise.allSettled to allow partial failures
      const [empRes, leaveRes, deptRes] = await Promise.allSettled([
        api.get("/api/v1/employees?per_page=1"),
        api.get(`/api/v1/leave-requests?status=pending&per_page=1`),
        api.get("/api/v1/departments?per_page=1"),
      ]);

      const getTotal = (res: PromiseSettledResult<any>) => 
        res.status === 'fulfilled' ? (res.value.data?.meta?.total || res.value.data?.total || 0) : 0;

      const totalEmployees = getTotal(empRes);
      const pendingRequests = getTotal(leaveRes);
      const departmentCount = getTotal(deptRes);

      let onLeaveToday = 0;
      let presentToday = Math.max(0, totalEmployees);

      try {
        // Only try to calculate present/onTime if employees loaded
        if (empRes.status === 'fulfilled') {
          // Fetch all leave requests for today (try-catch specifically for leaves)
          // We don't filter by status=approved in the API call to avoid backend connection errors if column is missing
          // We filter in memory instead
          const allLeaveRes = await api.get(`/api/v1/leave-requests?per_page=500`);
          const allLeaves = allLeaveRes.data?.data || allLeaveRes.data || [];
          
          onLeaveToday = allLeaves.filter((l: any) => {
            if (l.status !== 'approved') return false;
            const startDate = new Date(l.start_date);
            const endDate = new Date(l.end_date);
            const todayDate = new Date(today);
            return startDate <= todayDate && todayDate <= endDate;
          }).length;

          presentToday = Math.max(0, totalEmployees - onLeaveToday);
        }
      } catch (leaveErr) {
        console.warn("Could not calculate on-leave employees:", leaveErr);
        // Fallback: 0 on leave
      }

      setStats({
        totalEmployees,
        presentToday,
        onLeave: onLeaveToday,
        pendingRequests,
        totalPayroll: 0,
        departmentCount,
      });
      writeStored({
        totalEmployees,
        presentToday,
        onLeave: onLeaveToday,
        pendingRequests,
        totalPayroll: 0,
        departmentCount,
      });
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      // Don't show full blocking error, some stats might be 0
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readStored();
    if (stored && isFresh(stored.ts, ttlMs)) {
      setStats(stored.value);
      setLoading(false);
    } else {
      fetchStats();
    }

    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, refreshInterval, ttlMs]);

  return { stats, loading, error, refetch: fetchStats };
}
