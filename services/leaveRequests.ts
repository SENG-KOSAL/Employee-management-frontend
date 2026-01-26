import clientFetch from './api'

export type CreateLeaveRequestInput = {
  employee_id: number
  leave_type_id: number
  start_date: string
  end_date: string
  reason?: string
  status?: string
}

export type LeaveRequestDecision = 'approved' | 'rejected'
export type LeaveRequestAction = 'approve' | 'reject'

const toAction = (decision: LeaveRequestDecision): LeaveRequestAction =>
  decision === 'approved' ? 'approve' : 'reject'

const decideRequest = (
  id: number,
  decision: LeaveRequestDecision,
  approverNotes?: string,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST'
) =>
  clientFetch(`/api/v1/leave-requests/${id}/decide`, {
    method,
    data: {
      action: toAction(decision),
      ...(approverNotes ? { approver_notes: approverNotes } : {}),
    },
  })

const decide = async (id: number, decision: LeaveRequestDecision, approverNotes?: string) => {
  try {
    // Preferred: POST
    return await decideRequest(id, decision, approverNotes, 'POST')
  } catch (errPost) {
    try {
      // Backend may allow PATCH as well
      return await decideRequest(id, decision, approverNotes, 'PATCH')
    } catch (errPatch) {
      try {
        // Backend may allow PUT as well
        return await decideRequest(id, decision, approverNotes, 'PUT')
      } catch (errPut) {
        // Backward compatibility for older backends
        const legacyPath = decision === 'approved' ? 'approve' : 'reject'
        return clientFetch(`/api/v1/leave-requests/${id}/${legacyPath}`, { method: 'POST' })
      }
    }
  }
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
  decide,
  approve: (id: number, approverNotes?: string) => decide(id, 'approved', approverNotes),
  reject: (id: number, approverNotes?: string) => decide(id, 'rejected', approverNotes),
}
