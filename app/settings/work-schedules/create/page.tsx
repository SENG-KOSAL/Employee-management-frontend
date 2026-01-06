"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Clock, CalendarRange, AlertCircle, CheckCircle2 } from 'lucide-react'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'
import { workSchedulesService, CreateWorkScheduleInput } from '@/services/workSchedules'

const DAYS = [
  { label: 'Monday', value: 'mon' },
  { label: 'Tuesday', value: 'tue' },
  { label: 'Wednesday', value: 'wed' },
  { label: 'Thursday', value: 'thu' },
  { label: 'Friday', value: 'fri' },
  { label: 'Saturday', value: 'sat' },
  { label: 'Sunday', value: 'sun' },
] as const

export default function CreateWorkSchedulePage() {
  const router = useRouter()
  const [form, setForm] = useState<CreateWorkScheduleInput>({
    name: '',
    working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    hours_per_day: 8,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const toggleDay = (dayValue: (typeof DAYS)[number]['value']) => {
    setForm((prev) => {
      const hasDay = prev.working_days.includes(dayValue)
      return {
        ...prev,
        working_days: hasDay
          ? prev.working_days.filter((d) => d !== dayValue)
          : [...prev.working_days, dayValue],
      }
    })
  }

  const handleChange = (key: keyof CreateWorkScheduleInput, value: string | number | string[] | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      if (!form.name.trim()) {
        setError('Please enter a schedule name.')
        setSaving(false)
        return
      }
      if (!form.working_days.length) {
        setError('Please select at least one working day.')
        setSaving(false)
        return
      }

      await workSchedulesService.create({
        name: form.name.trim(),
        working_days: form.working_days,
        hours_per_day: Number(form.hours_per_day),
        notes: form.notes?.trim() || undefined,
      })

      setSuccess('Work schedule created successfully')
      setTimeout(() => router.push('/settings'), 800)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create work schedule'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <HRMSSidebar>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <span className="hidden sm:inline">Create a new work schedule</span>
          </div>
          {success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-100 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">New Work Schedule</h1>
              <p className="text-sm text-gray-500">Define the standard working window and days for a team.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Schedule Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Standard 5x8"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Hours Per Day</label>
                <input
                  type="number"
                  min={1}
                  step={0.25}
                  value={form.hours_per_day}
                  onChange={(e) => handleChange('hours_per_day', Number(e.target.value))}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">Total expected working hours each day.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-800">Working Days</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DAYS.map((day) => {
                  const selected = form.working_days.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all text-left flex items-center justify-between ${
                        selected
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{day.label}</span>
                      {selected ? <CheckCircle2 className="w-4 h-4" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Notes (optional)</label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add context, shift rules, or location."
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </HRMSSidebar>
  )
}
