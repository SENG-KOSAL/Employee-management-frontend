import adminApi from "@/services/adminApi";

/**
 * adminCompanies service
 *
 * Example API service calls requested for the Developer Console layer.
 * These all target Next.js API routes under /api/admin/* (same-origin).
 */

export type AdminCompany = {
  id: number | string;
  name: string;
  slug?: string | null;
  status?: string;
};

export async function listCompanies(params?: { per_page?: number }) {
  const res = await adminApi.get("/api/admin/companies", { params });
  return res.data as unknown;
}

export async function createCompany(payload: { name: string; slug?: string }) {
  const res = await adminApi.post("/api/admin/companies", payload);
  return res.data as unknown;
}

export async function getCompany(id: number | string) {
  const res = await adminApi.get(`/api/admin/companies/${id}`);
  return res.data as unknown;
}

export async function updateCompany(id: number | string, payload: { name: string; slug?: string | null; status?: string }) {
  const res = await adminApi.put(`/api/admin/companies/${id}`, payload);
  return res.data as unknown;
}

export async function enterCompanyContext(id: number | string) {
  const res = await adminApi.post(`/api/admin/companies/${id}/enter`);
  return res.data as unknown;
}

export async function exitCompanyContext() {
  const res = await adminApi.post("/api/admin/companies/exit");
  return res.data as unknown;
}

export async function getActiveCompany() {
  const res = await adminApi.get("/api/admin/companies/active");
  return res.data as unknown;
}
