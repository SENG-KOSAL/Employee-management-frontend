'use client'
import React, { useEffect, useState } from 'react'
import PageHeader from '../../../components/PageHeadder'
import DataTable from '../../../components/DataTable'
import LeaveTypeForm from '../../../components/forms/LeaveTypeForm'
import type { LeaveType } from '../../../types/hr'
import { leaveTypesService } from '../../../services/leaveTypes'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'

export default function LeaveTypesPage() {
  const [rows, setRows] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const response = await leaveTypesService.list()
      const items = (response as any)?.data?.data ?? (response as any)?.data ?? []
      setRows(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load leave types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create(input: { name: string; code?: string; is_paid: boolean }) {
    await leaveTypesService.create(input)
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Delete this leave type?')) return
    await leaveTypesService.remove(id)
    await load()
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        <PageHeader title="Leave Types" description="Define leave types (paid/unpaid) used in requests." backHref="/settings" backLabel="← Settings" />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <LeaveTypeForm onCreate={create} />
        </div>

        {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div> : null}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <DataTable
            rows={rows}
            columns={[
              { header: 'Name', render: (r) => r.name },
              { header: 'Code', render: (r) => r.code || '-' },
              { header: 'Paid', render: (r) => (r.is_paid ? 'Yes' : 'No'), width: 90 },
              {
                header: 'Actions',
                width: 120,
                render: (r) => (
                  <button
                    onClick={() => remove(r.id)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            emptyText="No leave types yet."
          />
        </div>
      </div>
    </HRMSSidebar>
  )
}