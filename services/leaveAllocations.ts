import clientFetch from './api'

export type CreateLeaveAllocationInput = {
  employee_id: number
  leave_type_id: number
  year?: number
  days_allocated: number
  days_used?: number
  start_date?: string
  end_date?: string
  note?: string
}

export type UpdateLeaveAllocationInput = {
  leave_type_id?: number
  year?: number
  days_allocated?: number
  days_used?: number
  start_date?: string
  end_date?: string
  note?: string
  employee_id?: number
}

export type LeaveAllocation = {
  id: number
  employee_id: number
  leave_type_id: number
  year?: number | null
  days_allocated?: number | null
  days_used?: number | null
  start_date?: string | null
  end_date?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
  // in case the API embeds leave type info
  leave_type?: {
    id: number
    name: string
    is_paid?: boolean
    code?: string | null
  }
}

export const leaveAllocationsService = {
  create: (input: CreateLeaveAllocationInput) =>
    clientFetch<LeaveAllocation>('/api/v1/leave-allocations', {
      method: 'POST',
      data: input,
    }),

  listByEmployee: (employeeId: number) =>
    clientFetch<LeaveAllocation[]>(`/api/v1/leave-allocations?employee_id=${employeeId}`, {
      method: 'GET',
    }),

  update: (id: number, input: UpdateLeaveAllocationInput) =>
    clientFetch<LeaveAllocation>(`/api/v1/leave-allocations/${id}`, {
      method: 'PUT',
      data: input,
    }),

  remove: (id: number) =>
    clientFetch<{ success: boolean }>(`/api/v1/leave-allocations/${id}`, {
      method: 'DELETE',
    }),
}
