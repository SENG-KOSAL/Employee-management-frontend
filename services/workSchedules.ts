import clientFetch from './api'

export type CreateWorkScheduleInput = {
  name: string
  working_days: string[]
  hours_per_day: number
  notes?: string | null
}

export const workSchedulesService = {
  list: () => clientFetch('/api/v1/work-schedules', { method: 'GET' }),

  listByEmployee: (employee_id: number | string, per_page: number = 20) =>
    clientFetch(`/api/v1/employee-work-schedules?employee_id=${employee_id}&per_page=${per_page}`, {
      method: 'GET',
    }),

  get: (id: number | string) => clientFetch(`/api/v1/work-schedules/${id}`, { method: 'GET' }),

  assignToEmployee: (employee_id: number | string, work_schedule_id: number | string, effective_from?: string) =>
    clientFetch('/api/v1/employee-work-schedules', {
      method: 'POST',
      data: { employee_id, work_schedule_id, effective_from },
    }),

  create: (input: CreateWorkScheduleInput) =>
    clientFetch('/api/v1/work-schedules', {
      method: 'POST',
      data: {
        name: input.name,
        working_days: input.working_days,
        hours_per_day: input.hours_per_day,
        notes: input.notes ?? undefined,
      },
    }),
}
