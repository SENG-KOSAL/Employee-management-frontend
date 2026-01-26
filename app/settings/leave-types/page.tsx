'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
  const loadedOnce = useRef(false)

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
    // Avoid double-fetch in React Strict Mode
    if (loadedOnce.current) return
    loadedOnce.current = true
    load()
  }, [])

  async function create(input: { name: string; code?: string; is_paid: boolean; default_days: number; days_per_year?: number }) {
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
        <PageHeader
          title="Leave Types"
          description="Define leave types (paid / unpaid) your team can request."
          backHref="/settings"
          backLabel="← Settings"
        />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.2fr]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add a leave type</h2>
                <p className="text-sm text-slate-500">Name it, optionally give it a short code, and mark if it is paid.</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Quick add</span>
            </div>
            <LeaveTypeForm onCreate={create} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Tips</h3>
                <p className="text-sm text-slate-500">Use short codes (e.g., AL, SL) and mark paid leave clearly.</p>
              </div>
            </div>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Keep codes short and recognizable for reports.</li>
              <li>Mark paid vs unpaid so payroll rules stay accurate.</li>
              <li>Delete unused types to keep the list tidy.</li>
            </ul>
            {error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
            ) : null}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Loading leave types...
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Existing leave types</h3>
              <p className="text-sm text-slate-500">Edit in settings; delete to remove unused ones.</p>
            </div>
            <span className="text-xs text-slate-500">{rows.length} total</span>
          </div>
          <DataTable
            rows={rows}
            columns={[
              {
                header: 'Name',
                render: (r) => (
                  <Link href={`/settings/leave-types/${r.id}`} className="text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                ),
              },
              { header: 'Code', render: (r) => r.code || '-' },
              { header: 'Paid', render: (r) => (r.is_paid ? 'Yes' : 'No'), width: 90 },
              { header: 'Days / Year', render: (r) => (r.default_days ?? r.days_per_year ?? '-'), width: 120 },
              {
                header: 'Actions',
                width: 120,
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/settings/leave-types/${r.id}/edit`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/settings/leave-types/${r.id}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
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