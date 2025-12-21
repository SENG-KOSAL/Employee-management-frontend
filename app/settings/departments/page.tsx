'use client'
import React, { useEffect, useState } from 'react'
import PageHeader from '../../../components/PageHeadder'
import DepartmentForm from '../../../components/forms/DepartmentForm'
import type { Department } from '../../../types/hr'
import { departmentsService } from '../../../services/departments'
import { Trash2 } from 'lucide-react'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'

export default function DepartmentsPage() {
  const [rows, setRows] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const { data } = await departmentsService.list()
      setRows(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create(input: { name: string; description?: string | null; status?: 'active' | 'inactive' }) {
    await departmentsService.create(input)
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Delete this department?')) return
    await departmentsService.remove(id)
    await load()
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6">
        <PageHeader title="Departments" description="Create and manage departments." backHref="/dashboard/settings" backLabel="← Settings" />

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>
      ) : null}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Add Department</h2>
          <p className="text-sm text-gray-500">Provide name, status, and optional description.</p>
        </div>
        <DepartmentForm onCreate={create} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
          <span className="text-sm text-gray-500">{rows.length} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No departments yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{r.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        r.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {r.status ?? 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.description || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => remove(r.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Delete ${r.name}`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </HRMSSidebar>
  )
}