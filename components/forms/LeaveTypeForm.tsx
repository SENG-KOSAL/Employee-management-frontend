'use client'
import React, { useState } from 'react'

export default function LeaveTypeForm(props: {
  onCreate: (input: { name: string; code?: string; is_paid: boolean; default_days: number; days_per_year?: number }) => Promise<void>
}) {
  const { onCreate } = props
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [daysPerYear, setDaysPerYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        code: code.trim() ? code.trim() : undefined,
        is_paid: isPaid,
        default_days: Number(daysPerYear) || 0,
        days_per_year: Number(daysPerYear) || 0,
      })
      setName('')
      setCode('')
      setIsPaid(true)
      setDaysPerYear('')
    } catch (err: any) {
      setError(err?.message || 'Failed to create leave type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
    >
      <div className="min-w-[240px] flex-[1_1_260px]">
        <label className="mb-1 block text-sm font-semibold text-slate-900">
          Leave type <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Annual Leave"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="min-w-[180px] flex-[1_1_200px]">
        <label className="mb-1 block text-sm font-semibold text-slate-900">Code (optional)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. AL"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

        <div className="min-w-[200px] flex-[1_1_220px]">
          <label className="mb-1 block text-sm font-semibold text-slate-900">
            Days allowed / year <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="number"
            min={0}
            value={daysPerYear}
            onChange={(e) => setDaysPerYear(e.target.value)}
            placeholder="e.g. 12"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

      <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
        <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
        Paid leave
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Add leave type'}
      </button>

      {error ? <div className="w-full text-sm font-medium text-red-600">{error}</div> : null}
    </form>
  )
}