import  clientFetch  from './api'
import type { LeaveType } from '../types/hr'

export type CreateLeaveTypeInput = {
  name: string
  code?: string
  is_paid: boolean
  default_days: number
  days_per_year?: number
}

export const leaveTypesService = {
  list: () => clientFetch<LeaveType[]>('/api/v1/leave-types', { method: 'GET' }),

  create: (input: CreateLeaveTypeInput) =>
    clientFetch<LeaveType>('/api/v1/leave-types', {
      method: 'POST',
      data: {
        ...input,
        // Send both for compatibility; backend expects default_days
        default_days: input.default_days,
        days_per_year: input.days_per_year ?? input.default_days,
      },
    }),

  get: (id: number) =>
    clientFetch<LeaveType>(`/api/v1/leave-types/${id}`, {
      method: 'GET',
    }),

  update: (id: number, input: Partial<CreateLeaveTypeInput>) =>
    clientFetch<LeaveType>(`/api/v1/leave-types/${id}`, {
      method: 'PUT',
      data: input,
    }),

  remove: (id: number) =>
    clientFetch<{ success: boolean }>(`/api/v1/leave-types/${id}`, {
      method: 'DELETE',
    }),
}