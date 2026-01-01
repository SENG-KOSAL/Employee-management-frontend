import clientFetch from './api'

export type CreateBenefitInput = {
  benefit_name?: string
  name?: string
  amount?: number
  type?: 'fixed' | 'percentage'
  benefit_id?: number
  employee_id?: number
}

export type UpdateBenefitInput = {
  id: number
  benefit_name?: string
  amount?: number
  type?: 'fixed' | 'percentage'
  employee_id?: number
}

export type CreateDeductionInput = {
  deduction_name?: string
  name?: string
  amount?: number
  type?: 'fixed' | 'percentage'
  reason?: string
  deduction_id?: number
  employee_id?: number
}

export type UpdateDeductionInput = {
  id: number
  deduction_name?: string
  amount?: number
  type?: 'fixed' | 'percentage'
  reason?: string
  employee_id?: number
}

export const benefitsService = {
  listBenefits: (employeeId?: number | string) =>
    clientFetch('/api/v1/employee-benefits', {
      method: 'GET',
      params: employeeId ? { employee_id: employeeId } : undefined,
    }),

  listDeductions: (employeeId?: number | string) =>
    clientFetch('/api/v1/employee-deductions', {
      method: 'GET',
      params: employeeId ? { employee_id: employeeId } : undefined,
    }),

  createBenefit: (input: CreateBenefitInput) => {
    const { employee_id, benefit_id, benefit_name, name, amount, type } = input
    const payload: Record<string, any> = {}
    if (employee_id !== undefined) payload.employee_id = employee_id
    if (benefit_id !== undefined) payload.benefit_id = benefit_id
    if (benefit_name !== undefined) payload.benefit_name = benefit_name
    if (name !== undefined) payload.name = name
    if (amount !== undefined) payload.amount = amount
    if (type !== undefined) payload.type = type

    return clientFetch('/api/v1/employee-benefits', {
      method: 'POST',
      data: payload,
    })
  },

  updateBenefit: ({ id, employee_id, ...rest }: UpdateBenefitInput) => {
    const payload = employee_id ? { employee_id, ...rest } : rest
    return clientFetch(`/api/v1/employee-benefits/${id}`, {
      method: 'PUT',
      data: payload,
    })
  },

  createDeduction: (input: CreateDeductionInput) => {
    const { employee_id, deduction_id, deduction_name, name, amount, type, reason } = input
    const payload: Record<string, any> = {}
    if (employee_id !== undefined) payload.employee_id = employee_id
    if (deduction_id !== undefined) payload.deduction_id = deduction_id
    if (deduction_name !== undefined) payload.deduction_name = deduction_name
    if (name !== undefined) payload.name = name
    if (amount !== undefined) payload.amount = amount
    if (type !== undefined) payload.type = type
    if (reason !== undefined) payload.reason = reason

    return clientFetch('/api/v1/employee-deductions', {
      method: 'POST',
      data: payload,
    })
  },

  updateDeduction: ({ id, employee_id, ...rest }: UpdateDeductionInput) => {
    const payload = employee_id ? { employee_id, ...rest } : rest
    return clientFetch(`/api/v1/employee-deductions/${id}`, {
      method: 'PUT',
      data: payload,
    })
  },

  removeBenefit: (id: number) =>
    clientFetch<{ success: boolean }>(`/api/v1/employee-benefits/${id}`, {
      method: 'DELETE',
    }),

  removeDeduction: (id: number) =>
    clientFetch<{ success: boolean }>(`/api/v1/employee-deductions/${id}`, {
      method: 'DELETE',
    }),
}