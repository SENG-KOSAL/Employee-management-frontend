import api from "./api";

export type PayrollPeriod = {
  id: number;
  company_id?: number;
  start_date: string;
  end_date: string;
  payment_date: string;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: number | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type PayrollPeriodInput = {
  start_date: string;
  end_date: string;
  payment_date: string;
};

const BASE = "/api/v1/payroll-periods";

const unwrapList = (payload: any): PayrollPeriod[] => {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const unwrapItem = (payload: any): PayrollPeriod | null => {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data as PayrollPeriod;
  if (payload && !Array.isArray(payload)) return payload as PayrollPeriod;
  return null;
};

export const payrollPeriodsService = {
  list: async () => {
    const res = await api.get(BASE);
    return { data: unwrapList(res.data) };
  },

  create: async (input: PayrollPeriodInput) => {
    const res = await api.post(BASE, input);
    return { data: unwrapItem(res.data) };
  },

  update: async (id: number, input: PayrollPeriodInput) => {
    const res = await api.put(`${BASE}/${id}`, input);
    return { data: unwrapItem(res.data) };
  },

  remove: async (id: number) => {
    const res = await api.delete(`${BASE}/${id}`);
    return { data: res.data };
  },

  lock: async (id: number) => {
    const res = await api.patch(`${BASE}/${id}/lock`);
    return { data: unwrapItem(res.data) };
  },
};
