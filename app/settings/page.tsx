import Link from 'next/link'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'

export default function SettingsPage() {
  return (
    <HRMSSidebar>
      <div className="space-y-6">
        {/* <PageHeader
          title="Settings"
          description="Configure HR-related master data."
          backHref="/dashboard"
          backLabel="← Dashboard"
        /> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/settings/leave-types"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="text-lg font-semibold text-gray-900">Leave Types</div>
            <div className="text-sm text-gray-500 mt-1">Define paid/unpaid leave types used in requests.</div>
          </Link>

          <Link
            href="/settings/departments"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="text-lg font-semibold text-gray-900">Departments</div>
            <div className="text-sm text-gray-500 mt-1">Create and manage departments for employees.</div>
          </Link>
          <Link
            href="/settings/benefits"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="text-lg font-semibold text-gray-900">Benefits & Deductions</div>
            <div className="text-sm text-gray-500 mt-1">Define payroll benefits and deductions.</div>
          </Link>
        </div>
      </div>
    </HRMSSidebar>
  )
}