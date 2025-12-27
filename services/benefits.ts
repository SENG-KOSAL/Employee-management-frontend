import clientFetch from './api'

export type CreateBenefitInput = {
  benefit_name: string
  amount: number
  type: 'fixed' | 'percentage'
  employee_id?: number
}

export type CreateDeductionInput = {
  deduction_name: string
  amount: number
  type: 'fixed' | 'percentage'
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
    const { employee_id, ...rest } = input
    const payload = employee_id ? { employee_id, ...rest } : rest
    return clientFetch('/api/v1/employee-benefits', {
      method: 'POST',
      data: payload,
    })
  },

  createDeduction: (input: CreateDeductionInput) => {
    const { employee_id, ...rest } = input
    const payload = employee_id ? { employee_id, ...rest } : rest
    return clientFetch('/api/v1/employee-deductions', {
      method: 'POST',
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