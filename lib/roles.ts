export const normalizeRole = (role: unknown): string => {
  return String(role ?? "").trim().toLowerCase();
};

export const isSuperAdminRole = (role: unknown): boolean => {
  const normalized = normalizeRole(role);
  return normalized === "super_admin" || normalized === "super-admin" || normalized === "superadmin";
};

export const isPlatformAdminRole = (role: unknown): boolean => {
  const normalized = normalizeRole(role);
  return isSuperAdminRole(normalized) || normalized === "developer";
};
