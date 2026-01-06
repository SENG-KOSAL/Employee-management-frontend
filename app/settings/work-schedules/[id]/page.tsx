"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'
import { workSchedulesService } from '@/services/workSchedules'
import { ChevronLeft, Clock, CalendarRange, AlertCircle, CheckCircle2, NotebookPen } from 'lucide-react'

interface WorkSchedule {
  id: number
  name: string
  working_days: string[]
  hours_per_day: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export default function WorkScheduleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let mounted = true
    const fetchOne = async () => {
      try {
        setLoading(true)
        const res = await workSchedulesService.get(id)
        const data = res?.data?.data ?? res?.data ?? null
        if (!mounted) return
        setSchedule(data)
        setError('')
      } catch (err: any) {
        if (!mounted) return
        setError(err?.response?.data?.message || 'Failed to load schedule')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    fetchOne()
    return () => {
      mounted = false
    }
  }, [id])

  const formattedDays = useMemo(() => {
    return (schedule?.working_days || []).map((d) => DAY_LABELS[d] || d)
  }, [schedule?.working_days])

  return (
    <HRMSSidebar>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <button
              type="button"
              onClick={() => router.push('/settings/work-schedules')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to schedules
            </button>
            {schedule ? <span className="hidden sm:inline">{schedule.name}</span> : null}
          </div>
          <Link
            href="/settings/work-schedules/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <NotebookPen className="w-4 h-4" />
            New Schedule
          </Link>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500 font-medium">Loading schedule...</p>
          </div>
        ) : !schedule ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Schedule not found</h3>
            <p className="text-gray-500 mt-1">It may have been removed or never existed.</p>
            <button
              onClick={() => router.push('/settings/work-schedules')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Back to list
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{schedule.name}</h1>
                <p className="text-sm text-gray-500">{schedule.hours_per_day} hours per day</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-gray-500" /> Working Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {formattedDays.map((day) => (
                    <span
                      key={day}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {day}
                    </span>
                  ))}
                  {formattedDays.length === 0 ? <span className="text-sm text-gray-500">No days set</span> : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-500" /> Notes
                </p>
                {schedule.notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
                ) : (
                  <p className="text-sm text-gray-500">No notes provided.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HRMSSidebar>
  )
}
