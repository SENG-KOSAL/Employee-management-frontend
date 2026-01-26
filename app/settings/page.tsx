import Link from 'next/link'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'

export default function SettingsPage() {
  return (
    <HRMSSidebar>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-500 mt-1 text-sm">Configure the master data that powers HR and payroll.</p>
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            Admin Console
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Link
            href="/settings/leave-types"
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-0.5 transition-all hover:shadow-md"
          >
            <div className="text-sm font-semibold text-blue-600 mb-1">Leave</div>
            <div className="text-lg font-bold text-gray-900">Leave Types</div>
            <div className="text-sm text-gray-500 mt-2">Define paid and unpaid leave buckets used in requests.</div>
          </Link>

          <Link
            href="/settings/departments"
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-0.5 transition-all hover:shadow-md"
          >
            <div className="text-sm font-semibold text-indigo-600 mb-1">Org</div>
            <div className="text-lg font-bold text-gray-900">Departments</div>
            <div className="text-sm text-gray-500 mt-2">Create and manage departments for employees.</div>
          </Link>

          <Link
            href="/settings/benefits"
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-0.5 transition-all hover:shadow-md"
          >
            <div className="text-sm font-semibold text-emerald-600 mb-1">Payroll</div>
            <div className="text-lg font-bold text-gray-900">Benefits & Deductions</div>
            <div className="text-sm text-gray-500 mt-2">Define payroll benefits, allowances, and deductions.</div>
          </Link>

          <Link
            href="/settings/work-schedules"
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-0.5 transition-all hover:shadow-md"
          >
            <div className="text-sm font-semibold text-orange-600 mb-1">Shifts</div>
            <div className="text-lg font-bold text-gray-900">Work Schedules</div>
            <div className="text-sm text-gray-500 mt-2">Define standard working hours and shift templates.</div>
          </Link>
        </div>
      </div>
    </HRMSSidebar>
  )
}