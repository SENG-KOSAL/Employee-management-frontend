import api from "@/services/api";

export type Permission = {
  key: string;
  description?: string | null;
};

function unwrapData<T>(res: unknown): T {
  const maybe = res as { data?: unknown } | undefined;
  const d = maybe?.data;
  if (d && typeof d === "object" && "data" in (d as Record<string, unknown>)) {
    return (d as { data: T }).data;
  }
  return (d as T) ?? (res as T);
}

export const permissionsService = {
  async list() {
    const res = await api.get("/api/v1/permissions");
    return unwrapData<Permission[]>(res.data);
  },

  async create(input: { key: string; description?: string }) {
    const res = await api.post("/api/v1/permissions", input);
    return unwrapData<Permission>(res.data);
  },

  async getRolePermissions(role: string) {
    const res = await api.get(`/api/v1/roles/${encodeURIComponent(role)}/permissions`);
    const data = unwrapData<{ permissions: string[] } | string[] | Record<string, unknown>>(res.data);

    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "permissions" in data) {
      const p = (data as { permissions?: unknown }).permissions;
      return Array.isArray(p) ? (p as string[]) : [];
    }
    return [];
  },

  async updateRolePermissions(role: string, permissions: string[]) {
    const res = await api.put(`/api/v1/roles/${encodeURIComponent(role)}/permissions`, { permissions });
    const data = unwrapData<{ permissions: string[] } | string[] | Record<string, unknown>>(res.data);

    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "permissions" in data) {
      const p = (data as { permissions?: unknown }).permissions;
      return Array.isArray(p) ? (p as string[]) : permissions;
    }
    return permissions;
  },
};
