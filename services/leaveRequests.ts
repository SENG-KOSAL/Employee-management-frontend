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
  create: (input: CreateLeaveRequestInput) =>
    clientFetch('/api/v1/leave-requests', {
      method: 'POST',
      data: input,
    }),
}
