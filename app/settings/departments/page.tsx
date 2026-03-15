'use client'
import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import DepartmentForm from '../../../components/forms/DepartmentForm'
import type { Department } from '../../../types/hr'
import { departmentsService } from '../../../services/departments'
import { Building2, CircleCheckBig, CircleX, Trash2 } from 'lucide-react'
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

  const activeCount = useMemo(
    () => rows.filter((r) => (r.status ?? 'active') === 'active').length,
    [rows]
  )
  const inactiveCount = useMemo(
    () => rows.filter((r) => r.status === 'inactive').length,
    [rows]
  )

  return (
    <HRMSSidebar>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 p-8 text-white shadow-lg shadow-indigo-500/20 sm:p-10">
          <div className="relative z-10">
            <Link href="/settings" className="mb-6 inline-flex items-center text-indigo-100 transition-colors hover:text-white text-sm font-semibold tracking-wide">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Config & Settings
            </Link>
            <div className="mb-3 flex items-center gap-4">
              <span className="rounded-2xl bg-white/15 p-3 backdrop-blur-md ring-1 ring-white/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Departments
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-indigo-100/90 sm:text-lg">
              Create and manage departments for your organization. Keep your workforce structured and beautifully organized.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total Departments</p>
              <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{rows.length}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Active</p>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CircleCheckBig className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-700">{activeCount}</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Inactive</p>
              <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <CircleX className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-rose-700">{inactiveCount}</p>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50/80 backdrop-blur-sm border-l-4 border-rose-500 rounded-r-2xl text-rose-800 text-sm flex items-center gap-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="font-medium text-base">{error}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <div className="sticky top-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />
              <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-7">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Add Department</h2>
                <p className="mt-1.5 text-sm text-slate-500">Create a new unit for better employee organization.</p>
              </div>
              <div className="px-6 py-6 sm:px-7">
                <DepartmentForm onCreate={create} />
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs font-medium text-slate-500 sm:px-7">
                Admin note: Use clear department names to improve reporting and payroll grouping.
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 sm:px-8 sm:py-6">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Directory</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Review, verify status, and remove outdated departments.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
                  {rows.length} {rows.length === 1 ? 'Department' : 'Departments'}
                </span>
              </div>

              {loading ? (
                <div className="px-6 py-6 sm:px-8">
                  <div className="mb-4 h-4 w-52 rounded skeleton" />
                  <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-12 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div className="col-span-4 h-4 rounded skeleton" />
                        <div className="col-span-4 h-4 rounded skeleton" />
                        <div className="col-span-2 h-4 rounded skeleton" />
                        <div className="col-span-2 ml-auto h-4 w-10 rounded skeleton" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-20 text-center sm:px-8">
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
                    <svg className="h-9 w-9 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">No departments found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">Create the first department from the form on the left to start organizing teams.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th scope="col" className="w-1/4 px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-8">Name</th>
                        <th scope="col" className="w-2/5 px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-8">Description</th>
                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-8">Status</th>
                        <th scope="col" className="w-[120px] px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((r) => (
                        <tr key={r.id} className="group transition-colors hover:bg-indigo-50/35 even:bg-slate-50/25">
                          <td className="whitespace-nowrap px-6 py-4 sm:px-8">
                            <div className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-indigo-700">{r.name}</div>
                          </td>
                          <td className="px-6 py-4 sm:px-8">
                            <div className="max-w-md break-words text-sm font-medium text-slate-500">
                              {r.description || <span className="font-medium italic text-slate-300">No description</span>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 sm:px-8">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                                r.status === 'inactive'
                                  ? 'border-slate-200 bg-slate-100 text-slate-600'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${r.status === 'inactive' ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                              {r.status ?? 'active'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right sm:px-8">
                            <button
                              onClick={() => remove(r.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Delete ${r.name}`}
                              title="Delete Department"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </HRMSSidebar>
  )
}