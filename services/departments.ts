import api from './api'
import type { Department } from '../types/hr'

export type CreateDepartmentInput = {
  name: string
  description?: string | null
  status?: 'active' | 'inactive'
}

export type UpdateDepartmentInput = {
  name: string
  description?: string | null
  status?: 'active' | 'inactive'
}

const BASE = '/api/v1/departments'

export const departmentsService = {
  list: async () => {
    const res = await api.get(BASE)
    return { data: (res.data?.data ?? []) as Department[] }
  },

  create: async (input: CreateDepartmentInput) => {
    const res = await api.post(BASE, input)
    return { data: (res.data?.data ?? null) as Department | null }
  },

  getById: async (id: number) => {
    const res = await api.get(`${BASE}/${id}`)
    return { data: (res.data?.data ?? null) as Department | null }
  },

  update: async (id: number, input: UpdateDepartmentInput) => {
    const res = await api.put(`${BASE}/${id}`, input)
    return { data: (res.data?.data ?? null) as Department | null }
  },

  remove: async (id: number) => {
    const res = await api.delete(`${BASE}/${id}`)
    return { data: res.data }
  },
}