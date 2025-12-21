export type Department = {
  id: number
  name: string
  description?: string | null
  status?: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export type LeaveType = {
  id: number
  name: string
  code?: string | null
  is_paid: boolean
  created_at?: string
  updated_at?: string
}