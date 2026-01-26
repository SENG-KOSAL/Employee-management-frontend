"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { leaveTypesService } from "@/services/leaveTypes"
import type { LeaveType } from "@/types/hr"
import { HRMSSidebar } from "@/components/layout/HRMSSidebar"
import { ArrowLeft } from "lucide-react"

export default function LeaveTypeEditPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id
  const leaveTypeId = idParam ? Number(idParam) : null

  const [form, setForm] = useState({
    name: "",
    code: "",
    is_paid: true,
    default_days: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
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
        if (data) {
          setForm({
            name: data.name || "",
            code: data.code || "",
            is_paid: Boolean(data.is_paid),
            default_days: String(data.default_days ?? data.days_per_year ?? ""),
          })
        }
      } catch (err: any) {
        console.error(err)
        setError(err?.response?.data?.message || "Failed to load leave type")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [leaveTypeId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveTypeId) return
    if (!form.name.trim()) {
      setError("Name is required")
      return
    }
    const days = Number(form.default_days)
    if (!Number.isFinite(days) || days < 0) {
      setError("Days must be 0 or more")
      return
    }
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      await leaveTypesService.update(leaveTypeId, {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        is_paid: form.is_paid,
        default_days: days,
        days_per_year: days,
      })
      setSuccess("Leave type updated")
      setTimeout(() => router.push(`/settings/leave-types/${leaveTypeId}`), 800)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || "Failed to update leave type")
    } finally {
      setSaving(false)
    }
  }

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
      <div className="space-y-6 p-4 md:p-6 max-w-3xl">
        <Link href={`/settings/leave-types/${leaveTypeId || ""}`} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to detail
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Leave Type</h1>
          <p className="text-sm text-gray-500">Update name, code, paid flag, and days per year.</p>
        </div>

        {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div> : null}
        {success ? <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{success}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. AL"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Days per year *</label>
              <input
                type="number"
                min={0}
                step={1}
                name="default_days"
                value={form.default_days}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" name="is_paid" checked={form.is_paid} onChange={handleChange} />
                Paid leave
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={`/settings/leave-types/${leaveTypeId || ""}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </HRMSSidebar>
  )
}
