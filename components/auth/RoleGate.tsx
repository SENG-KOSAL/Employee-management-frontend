"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import api from "@/services/api"
import { getMe, getToken, saveMe } from "@/utils/auth"

type MePayload = {
  employee?: {
    role?: string | null
  } | null
  role?: string | null
}

function getRole(me: MePayload | null): string | null {
  const role = me?.employee?.role ?? me?.role ?? null
  return role ? String(role).toLowerCase() : null
}

function isSuperRole(role: string | null): boolean {
  if (!role) return false
  const normalized = String(role).toLowerCase()
  return normalized === "super_admin" || normalized === "super-admin" || normalized === "superadmin" || normalized === "developer"
}

export function RoleGate({
  allowRoles,
  children,
  fallback,
  redirectTo,
}: {
  allowRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}) {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    const cached = getMe<MePayload>()
    return getRole(cached)
  })

  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true
    const token = getToken()
    if (!token) return true
    const cached = getMe<MePayload>()
    return !cached
  })

  const allowed = useMemo(() => {
    if (!role) return false
    if (isSuperRole(role)) return true
    return allowRoles.map((r) => r.toLowerCase()).includes(role)
  }, [allowRoles, role])

  useEffect(() => {
    let cancelled = false

    const token = getToken()
    if (!token) {
      router.replace("/auth/login")
      return
    }

    const cached = getMe<MePayload>()
    if (cached) {
      return
    }

    api
      .get("/api/v1/me")
      .then((res) => {
        const data: unknown = (res.data as { data?: unknown } | undefined)?.data ?? res.data
        const next: MePayload = (data && typeof data === "object" ? (data as MePayload) : {}) as MePayload
        saveMe(next)
        if (cancelled) return
        setRole(getRole(next))
      })
      .catch(() => {
        if (cancelled) return
        setRole(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (loading) return
    if (allowed) return
    if (!redirectTo) return
    router.replace(redirectTo)
  }, [allowed, loading, redirectTo, router])

  if (loading) return null
  if (allowed) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="text-xs uppercase text-red-600 font-semibold">Forbidden</div>
      <h2 className="text-lg font-bold text-gray-900 mt-1">You don’t have access to this page</h2>
      <p className="text-sm text-gray-600 mt-2">Ask an admin to grant access for your role.</p>
      <button
        type="button"
        onClick={() => router.replace("/dashboard")}
        className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow"
      >
        Go to dashboard
      </button>
    </div>
  )
}
