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
      <div className="max-w-7xl mx-auto space-y-8 py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
        {/* Animated & Colorful Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 rounded-[2rem] p-8 sm:p-10 text-white shadow-xl shadow-blue-500/20">
          <div className="relative z-10">
            <a href="/settings" className="inline-flex items-center text-blue-100 hover:text-white transition-colors mb-6 text-sm font-semibold tracking-wide">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Config & Settings
            </a>
            <div className="flex items-center gap-4 mb-3">
              <span className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Departments
              </h1>
            </div>
            <p className="text-blue-100/90 max-w-2xl text-base sm:text-lg opacity-90 leading-relaxed font-medium mt-2">
              Create and manage departments for your organization. Keep your workforce structured and beautifully organized.
            </p>
          </div>
          {/* Decorative shapes for flair */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
          <div className="absolute -bottom-20 right-20 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50/80 backdrop-blur-sm border-l-4 border-rose-500 rounded-r-2xl text-rose-800 text-sm flex items-center gap-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="font-medium text-base">{error}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Form Section */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-6 sm:p-8 sticky top-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-800">Add Department</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">Fill in the details to create a new department unit.</p>
              </div>
              <div className="department-form-container">
                <DepartmentForm onCreate={create} />
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 overflow-hidden text-slate-800">
              <div className="px-8 py-6 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-slate-800">Directory</h2>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm">
                  {rows.length} {rows.length === 1 ? 'Department' : 'Departments'}
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col justify-center items-center py-24 gap-5">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
                  <p className="text-sm font-bold text-slate-400 animate-pulse tracking-wide">Loading departments...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-28 px-6 flex flex-col items-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-indigo-50/50 mb-6 shadow-inner border border-indigo-100/50">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">No departments found</h3>
                  <p className="mt-3 text-base text-slate-500 max-w-sm mx-auto font-medium">Get started by creating your first department using the form on the left.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest w-1/4">Name</th>
                        <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest w-2/5">Description</th>
                        <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th scope="col" className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 bg-white">
                      {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-indigo-50/40 transition-all duration-200 group">
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{r.name}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-sm text-slate-500 font-medium max-w-[200px] sm:max-w-xs truncate">{r.description || <span className="text-slate-300 italic font-medium">No description</span>}</div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide capitalize ${
                                r.status === 'inactive' 
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200/60' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-2.5 shadow-sm ${r.status === 'inactive' ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                              {r.status ?? 'active'}
                            </span>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => remove(r.id)}
                              className="inline-flex items-center justify-center p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 hover:shadow-sm"
                              aria-label={`Delete ${r.name}`}
                              title="Delete Department"
                            >
                              <Trash2 className="w-5 h-5" />
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