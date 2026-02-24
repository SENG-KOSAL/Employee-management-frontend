import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";

export interface ActivityItem {
  id: string;
  type: "leave" | "employee" | "payroll" | "request";
  action: string;
  description: string;
  timestamp: string;
  icon: string;
}

const STORAGE_KEY = "hrms.recentActivity.v1";

type StoredActivity = {
  ts: number;
  value: ActivityItem[];
};

const readStored = (): StoredActivity | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.ts !== "number" || !Array.isArray(rec.value)) return null;
    return { ts: rec.ts, value: rec.value as ActivityItem[] };
  } catch {
    return null;
  }
};

const writeStored = (value: ActivityItem[]) => {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredActivity = { ts: Date.now(), value };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const isFresh = (ts: number, ttlMs: number) => Date.now() - ts < ttlMs;

export function useRecentActivity(limit = 8, refreshInterval = 0, ttlMs = 5 * 60 * 1000) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      // Fetch recent leave approvals, new employees, etc.
      const [leaveRes, empRes] = await Promise.all([
        api.get("/api/v1/leave-requests?per_page=5&sort=-updated_at"),
        api.get("/api/v1/employees?per_page=5&sort=-created_at"),
      ]);

      const leaves = leaveRes.data?.data || leaveRes.data || [];
      const emps = empRes.data?.data || empRes.data || [];

      const items: ActivityItem[] = [];

      // Add recent leave updates
      leaves.forEach((leave: any) => {
        items.push({
          id: `leave-${leave.id}`,
          type: "leave",
          action: `Leave ${leave.status || "pending"}`,
          description: `${leave.employee?.full_name || leave.employee?.first_name} (${leave.leave_type?.name || "Unknown"})`,
          timestamp: leave.updated_at || leave.created_at,
          icon: "🏖️",
        });
      });

      // Add recent employees
      emps.forEach((emp: any) => {
        items.push({
          id: `emp-${emp.id}`,
          type: "employee",
          action: "New employee",
          description: emp.full_name || `${emp.first_name} ${emp.last_name}`,
          timestamp: emp.created_at,
          icon: "👤",
        });
      });

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const sliced = items.slice(0, limit);
      setActivities(sliced);
      writeStored(sliced);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    const stored = readStored();
    if (stored && isFresh(stored.ts, ttlMs)) {
      setActivities(stored.value.slice(0, limit));
      setLoading(false);
    } else {
      fetchActivities();
    }

    if (refreshInterval > 0) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchActivities, limit, refreshInterval, ttlMs]);

  return { activities, loading, refetch: fetchActivities };
}
