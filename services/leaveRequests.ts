import clientFetch from './api'

export type CreateLeaveRequestInput = {
  employee_id: number
  leave_type_id: number
  start_date: string
  end_date: string
  reason?: string
  status?: string
}

export const leaveRequestsService = {
  list: (query?: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.append(key, String(value))
      })
    }
    return clientFetch(`/api/v1/leave-requests${params.toString() ? `?${params.toString()}` : ""}`)
  },
  create: (input: CreateLeaveRequestInput) =>
    clientFetch('/api/v1/leave-requests', {
      method: 'POST',
      data: input,
    }),
  updateStatus: (id: number, status: string) =>
    clientFetch(`/api/v1/leave-requests/${id}`, {
      method: 'PUT',
      data: { status },
    }),
  approve: (id: number) => clientFetch(`/api/v1/leave-requests/${id}/approve`, { method: 'POST' }),
  reject: (id: number) => clientFetch(`/api/v1/leave-requests/${id}/reject`, { method: 'POST' }),
}
