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

export function useRecentActivity(limit = 8) {
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
      setActivities(items.slice(0, limit));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}
