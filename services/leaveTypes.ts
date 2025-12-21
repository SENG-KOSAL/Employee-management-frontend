import  clientFetch  from './api'
import type { LeaveType } from '../types/hr'

export type CreateLeaveTypeInput = {
  name: string
  code?: string
  is_paid: boolean
}

export const leaveTypesService = {
  list: () => clientFetch<LeaveType[]>('/api/leave-types', { method: 'GET' }),

  create: (input: CreateLeaveTypeInput) =>
    clientFetch<LeaveType>('/api/leave-types', {
      method: 'POST',
      data: JSON.stringify(input),
    }),

  remove: (id: number) =>
    clientFetch<{ success: boolean }>(`/api/leave-types/${id}`, {
      method: 'DELETE',
    }),
}