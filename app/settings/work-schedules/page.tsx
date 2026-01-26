"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'
import { workSchedulesService } from '@/services/workSchedules'
import { Plus, Clock, CalendarRange, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

interface WorkSchedule {
  id: number
  name: string
  working_days: string[]
  hours_per_day: number
  notes?: string | null
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export default function WorkSchedulesListPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await workSchedulesService.list()
        const data = res?.data?.data ?? res?.data ?? []
        if (!mounted) return
        setSchedules(Array.isArray(data) ? data : [])
        setError('')
      } catch (err: any) {
        if (!mounted) return
        setError(err?.response?.data?.message || 'Failed to load work schedules')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [])

  const sorted = useMemo(() => {
    return [...schedules].sort((a, b) => a.name.localeCompare(b.name))
  }, [schedules])

  return (
    <HRMSSidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work Schedules</h1>
            <p className="text-gray-500 mt-1 text-sm">View and manage standard working patterns for your teams.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings/work-schedules/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Schedule
            </Link>
          </div>
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
            <p className="text-gray-500 font-medium">Loading work schedules...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarRange className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No work schedules yet</h3>
            <p className="text-gray-500 mt-1">Create your first schedule to standardize working hours.</p>
            <div className="mt-4">
              <Link
                href="/settings/work-schedules/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Schedule
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((sch) => (
              <button
                key={sch.id}
                onClick={() => router.push(`/settings/work-schedules/${sch.id}`)}
                className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{sch.name}</h3>
                      <p className="text-sm text-gray-500">{sch.hours_per_day} hours/day</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {sch.working_days.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {DAY_LABELS[d] || d}
                    </span>
                  ))}
                </div>

                {sch.notes ? (
                  <p className="text-sm text-gray-600 line-clamp-2">{sch.notes}</p>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </HRMSSidebar>
  )
}
