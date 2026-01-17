import clientFetch from './api'

export type CreateOvertimeInput = {
  employee_id: number
  work_date: string
  hours: number
  rate?: number
  reason?: string | null
}

export type OvertimeEntry = {
  id?: number
  employee_id: number
  work_date?: string
  date?: string
  hours: number
  rate?: number
  reason?: string | null
  created_at?: string
  updated_at?: string
}

export const overtimesService = {
  listByEmployee: (employeeId: number | string) =>
    clientFetch<OvertimeEntry[]>(`/api/v1/overtimes`, {
      method: 'GET',
      params: { employee_id: employeeId },
    }),

  create: (input: CreateOvertimeInput) =>
    clientFetch<OvertimeEntry>('/api/v1/overtimes', {
      method: 'POST',
      data: input,
    }),
}
