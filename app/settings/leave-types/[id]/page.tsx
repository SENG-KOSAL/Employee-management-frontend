"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { leaveTypesService } from "@/services/leaveTypes"
import type { LeaveType } from "@/types/hr"
import { HRMSSidebar } from "@/components/layout/HRMSSidebar"
import { ArrowLeft } from "lucide-react"

export default function LeaveTypeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id
  const leaveTypeId = idParam ? Number(idParam) : null

  const [item, setItem] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const loadedOnce = useRef(false)

  useEffect(() => {
    if (!leaveTypeId || Number.isNaN(leaveTypeId)) {
      setError("Invalid leave type id")
      setLoading(false)
      return
    }

    if (loadedOnce.current) return
    loadedOnce.current = true

    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await leaveTypesService.get(leaveTypeId)
        const data = (res as any)?.data?.data ?? (res as any)?.data ?? null
        setItem(data ?? null)
      } catch (err: any) {
        console.error(err)
        setError(err?.response?.data?.message || "Failed to load leave type")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [leaveTypeId])

  if (loading) {
    return (
      <HRMSSidebar>
        <div className="p-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="mt-3 text-gray-600 text-sm">Loading leave type...</p>
        </div>
      </HRMSSidebar>
    )
  }

  return (
    <HRMSSidebar>
      <div className="space-y-6 p-4 md:p-6">
        <Link href="/settings/leave-types" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to leave types
        </Link>

        {item ? (
          <div className="flex gap-3">
            <Link
              href={`/settings/leave-types/${item.id}/edit`}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700"
            >
              Edit
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        ) : null}

        {item ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-sm text-gray-500">Leave type ID: {item.id}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
                <p className="text-sm text-gray-500">Code</p>
                <p className="text-base font-semibold text-gray-900">{item.code || "-"}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-base font-semibold text-gray-900">{item.is_paid ? "Yes" : "No"}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
                <p className="text-sm text-gray-500">Days per year</p>
                <p className="text-base font-semibold text-gray-900">{item.default_days ?? item.days_per_year ?? "-"}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-base font-semibold text-gray-900">{item.created_at || "-"}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
                <p className="text-sm text-gray-500">Updated</p>
                <p className="text-base font-semibold text-gray-900">{item.updated_at || "-"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            Leave type not found.
          </div>
        )}
      </div>
    </HRMSSidebar>
  )
}
