"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  ShieldCheck,
  Shield,
  Settings,
  CalendarClock,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Bell,
  Circle,
  FileWarning,
  X,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import api from "@/services/api"
import { getMe, getToken, removeMe, removeToken } from "@/utils/auth"
import { useRouter } from "next/navigation"
import TenantSwitcher from "@/components/admin/TenantSwitcher"
import { useActiveCompany } from "@/context/ActiveCompanyContext"

type MePayload = {
  name?: string
  company?: {
    name?: string | null
  } | null
  employee?: {
    full_name?: string | null
    id?: number
    role?: string | null
  } | null
  role?: string | null
}

const managerNavigation = {
  main: [
    // {
    //   title: "Manager Portal",
    //   icon: ShieldCheck,
    //   href: "/manager",
    // },
    {
      title: "My Profile",
      icon: Users,
      href: "/manager/profile",
    },
    {
      title: "Team Employees",
      icon: Clock,
      href: "/manager/team",
    },
    {
      title: "Team Attendance",
      icon: CalendarClock,
      href: "/manager/attendance",
    },
    {
      title: "Leave Approvals",
      icon: CalendarClock,
      href: "/manager/leave-approvals",
    },
    {
      title: "Request Leave",
      icon: CalendarClock,
      href: "/manager/request-leave",
    },
  ],
  system: [],
}

// Navigation structure for admins/managers
const navigation = {
  main: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    // {
    //   title: "Manager Portal",
    //   icon: ShieldCheck,
    //   href: "/manager",
    // },
    {
      title: "Employee Management",
      icon: Users,
      items: [
        { title: "Dashboard", href: "/employees/dashboard" },
        { title: "Employees", href: "/employees" },
        { title: "📊 Report", href: "/employees/reports" },
        // { title: "Departments", href: "/departments" },
        // { title: "Positions / Roles", href: "/positions" },
      ],
    },
    {
      title: "Attendance & Leave",
      icon: Clock,
      items: [
        { title: "Dashboard", href: "/attendance/dashboard" },
        { title: "Attendance", href: "/attendance" },
        { title: "Leave Requests", href: "/leave-requests" },
        // { title: "Holidays", href: "/holidays" },
        { title: "Overtime", href: "/request/OverTime" },
        { title: "📊 Report", href: "/reports/attendance" }
      ],
    },
    {
      title: "Payroll",
      icon: Wallet,
      items: [
        { title: "Dashboard", href: "/payroll/dashboard" },
        { title: "Payroll", href: "/payroll" },
        { title: "Payslips", href: "/payslips" },
        { title: "Salary", href: "/salaries" },
        { title: "📊 Report", href: "/reports/payroll" },
      ],
    },
    // Reporting module hidden (moved under Employee Management -> 📊 Report)
    // {
    //   title: "Recruitment",
    //   icon: Megaphone,
    //   items: [
    //     { title: "Job Posts", href: "/job-posts" },
    //     { title: "Applicants", href: "/applicants" },
    //   ],
    // },
    // {
    //   title: "Performance",
    //   icon: BarChart3,
    //   items: [{ title: "Performance Reviews", href: "/performance-reviews" }],
    // },
  ],
  system: [
    {
      title: "Users & Permissions",
      icon: Shield,
      href: "/users-permissions",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ],
}

function NavItem({
  item,
  pathname,
}: {
  item: {
    title: string
    icon: React.ElementType
    href?: string
    items?: { title: string; href: string }[]
  }
  pathname: string
}) {
  const Icon = item.icon
  const isActive = item.href === pathname
  const hasSubItems = item.items && item.items.length > 0
  const isSubActive = hasSubItems && item.items?.some((sub) => sub.href === pathname)

  if (hasSubItems) {
    return (
      <Collapsible defaultOpen={isSubActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              className="group-data-[state=open]/collapsible:bg-blue-50 group-data-[state=open]/collapsible:text-blue-600"
            >
              <Icon className="size-4" />
              <span>{item.title}</span>
              <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all">
            <SidebarMenuSub>
              {item.items?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.href}>
                  <SidebarMenuSubButton asChild isActive={subItem.href === pathname}>
                    <Link href={subItem.href}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  if (!item.href) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={item.title} disabled>
          <Icon className="size-4" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarNav({ nav }: { nav: typeof navigation | typeof managerNavigation }) {
  const pathname = usePathname()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {nav.main.map((item) => (
              <NavItem key={`${item.title}-${item.href ?? "group"}`} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {nav.system.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.system.map((item) => (
                <NavItem key={`${item.title}-${item.href ?? "group"}`} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
    </>
  )
}

function SidebarUserFooter({
  displayName,
  userRole,
  initials,
  onLogout,
}: {
  displayName: string
  userRole: string | null
  initials: string
  onLogout: () => void
}) {
  const { state, toggleSidebar } = useSidebar()

  return (
    <SidebarFooter className="border-t border-gray-100 p-2">
      <div className={`flex items-center gap-2 p-2 rounded-xl transition-all mb-2 ${state === "expanded" ? "bg-gray-50" : "justify-center"}`}>
        <div className="relative shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm text-blue-600 font-bold text-xs">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 block size-2 rounded-full bg-green-500 ring-1.5 ring-white"></span>
        </div>

        {state === "expanded" && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-none">{displayName || "User"}</p>
            <p className="text-xs text-gray-500 truncate mt-1 capitalize">{userRole || "Team Member"}</p>
          </div>
        )}
      </div>

      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={onLogout}
            tooltip="Sign out"
            className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={toggleSidebar}
            tooltip={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
            className="text-gray-500"
          >
            {state === "expanded" ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
            <span>Collapse sidebar</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

export function HRMSSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { activeCompany, isSupportMode } = useActiveCompany()
  const [displayName, setDisplayName] = useState<string>("")
  const [me, setMe] = useState<MePayload | null>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationItems, setNotificationItems] = useState<Array<{ id: string; label: string; level: "amber" | "red" | "blue" }>>([])
  // HRMSSidebar is for admin/manager UI. Employee UI uses EmployeeSidebar.

  const initials = useMemo(() => {
    const raw = displayName.trim()
    if (!raw) return "--"
    const parts = raw.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ""
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
    return (first + second).toUpperCase() || "--"
  }, [displayName])

  const userRole = useMemo(() => (me?.employee?.role ?? me?.role ?? null), [me?.employee?.role, me?.role])
  const companyName = useMemo(() => {
    const supportName = activeCompany?.name?.trim()
    if (supportName) return supportName
    const meCompany = me?.company?.name?.trim()
    if (meCompany) return meCompany
    return "Company"
  }, [activeCompany?.name, me?.company?.name])
  const normalizedRole = (userRole || "").toLowerCase()
  const isManager = normalizedRole === "manager"
  const isSuperAdmin =
    normalizedRole === "super_admin" ||
    normalizedRole === "super-admin" ||
    normalizedRole === "superadmin" ||
    normalizedRole === "developer"
  const isAdmin = normalizedRole === "admin" || isSuperAdmin

  const navToUse = useMemo(() => {
    if (isManager) return managerNavigation
    if (isAdmin) return navigation
    const base = {
      ...navigation,
      system: navigation.system.filter((item) => item.href !== "/users-permissions"),
    }

    if (isSuperAdmin) {
      return {
        ...base,
        system: [
          { title: "Developer Console", icon: ShieldCheck, href: "/super-admin" },
          ...base.system,
        ],
      }
    }

    return base
  }, [isAdmin, isManager, isSuperAdmin])

  useEffect(() => {
    if (!isManager) return
    if (!pathname) return
    if (pathname === "/manager" || pathname.startsWith("/manager/")) return
    router.replace("/manager")
  }, [isManager, pathname, router])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    // Use cached user info to avoid repeated /me calls.
    const cached = getMe<MePayload>()
    if (cached) {
      setMe(cached)
      setDisplayName(cached.employee?.full_name || cached.name || "")
      return
    }

    // Fallback: fetch once if cache missing.
    api
      .get("/api/v1/me")
      .then((res) => {
        const data: unknown = (res.data as { data?: unknown } | undefined)?.data ?? res.data
        const next: MePayload = (data && typeof data === "object" ? (data as MePayload) : {}) as MePayload
        setMe(next)
        setDisplayName(next.employee?.full_name || next.name || "")
      })
      .catch(() => {
        // ignore
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async () => {
      try {
        setNotificationLoading(true)
        const [leaveRes, payrollRes] = await Promise.all([
          api.get("/api/v1/leave-requests?status=pending&per_page=50"),
          api.get("/api/v1/payroll-runs?per_page=30"),
        ])

        if (cancelled) return

        const leavePayload = (leaveRes.data as { data?: unknown } | undefined)?.data ?? leaveRes.data
        const payrollPayload = (payrollRes.data as { data?: unknown } | undefined)?.data ?? payrollRes.data
        const leaves = Array.isArray(leavePayload) ? leavePayload : (leavePayload as { data?: unknown[] } | undefined)?.data || []
        const runs = Array.isArray(payrollPayload) ? payrollPayload : (payrollPayload as { data?: unknown[] } | undefined)?.data || []

        const pendingLeaves = leaves.length
        const draftRuns = runs.filter((run: any) => String(run?.status || "").toLowerCase() === "draft").length
        const approvedRuns = runs.filter((run: any) => String(run?.status || "").toLowerCase() === "approved").length

        const nextItems: Array<{ id: string; label: string; level: "amber" | "red" | "blue" }> = []

        if (pendingLeaves > 0) {
          nextItems.push({
            id: "pending-leave",
            label: `${pendingLeaves} leave approvals pending action`,
            level: pendingLeaves > 20 ? "red" : "amber",
          })
        }

        if (draftRuns > 0) {
          nextItems.push({
            id: "draft-payroll",
            label: `${draftRuns} payroll run(s) are still in draft`,
            level: "amber",
          })
        }

        if (approvedRuns > 0) {
          nextItems.push({
            id: "approved-payroll",
            label: `${approvedRuns} approved payroll run(s) awaiting mark paid`,
            level: "blue",
          })
        }

        if (nextItems.length === 0) {
          nextItems.push({
            id: "all-clear",
            label: "No urgent pending actions at the moment",
            level: "blue",
          })
        }

        setNotificationItems(nextItems)
      } catch {
        if (cancelled) return
        setNotificationItems([
          {
            id: "notification-error",
            label: "Unable to load notifications. Try refresh.",
            level: "red",
          },
        ])
      } finally {
        if (!cancelled) setNotificationLoading(false)
      }
    }

    void loadNotifications()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/logout")
    } catch {
      // ignore network/API errors; still clear local token
    } finally {
      removeMe()
      removeToken()
      router.push("/auth/login")
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        {/* Header with Logo */}
        <SidebarHeader className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm">
              HR
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-gray-900 truncate">{companyName}</span>
              <span className="text-xs text-gray-500">{isSupportMode ? "Support Mode" : "Management System"}</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation Content */}
        <SidebarContent className="px-2 py-2">
          <SidebarNav nav={navToUse} />
        </SidebarContent>

        {/* Footer with User & Actions */}
        <SidebarUserFooter 
          displayName={displayName}
          userRole={userRole}
          initials={initials}
          onLogout={handleLogout}
        />
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden mr-2" />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">{companyName}</h1>
              <span className="text-xs text-slate-500 font-medium">{isSupportMode ? "Support Mode" : "Management System"}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {isSuperAdmin ? <TenantSwitcher /> : null}
            <button
              onClick={() => setNotificationOpen(true)}
              className="relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              aria-label="Open notification center"
            >
              <Bell className="h-4 w-4" />
              {notificationItems.length > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {notificationItems.length}
                </span>
              ) : null}
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-600">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className="text-xs text-slate-400 mt-1">{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/70 p-6">{children}</main>

        <div
          className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-200 ${notificationOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setNotificationOpen(false)}
        />

        <aside
          className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${notificationOpen ? "translate-x-0" : "translate-x-full"}`}
          aria-hidden={!notificationOpen}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Notification Center</h2>
              <p className="text-xs text-slate-500">Pending actions and latest audit-style events</p>
            </div>
            <button
              onClick={() => setNotificationOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notification center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 overflow-y-auto h-[calc(100%-72px)] space-y-4">
            {notificationLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {notificationItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition-all hover:-translate-y-0.5 ${item.level === "red" ? "border-red-200 bg-red-50 text-red-700" : item.level === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700"}`}
                    >
                      <div className="flex items-start gap-2">
                        <FileWarning className="h-4 w-4 mt-0.5" />
                        <span>{item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-3">Recent activity timeline</h3>
                  <div className="space-y-3">
                    {[
                      "Employee profile updated",
                      "Payroll run status changed",
                      "Leave request decision recorded",
                    ].map((event, idx) => (
                      <div key={event} className="flex items-start gap-3">
                        <Circle className={`h-3 w-3 mt-1.5 ${idx === 0 ? "text-indigo-500" : idx === 1 ? "text-emerald-500" : "text-amber-500"}`} fill="currentColor" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">{event}</p>
                          <p className="text-xs text-slate-500">{new Date(Date.now() - idx * 60 * 60 * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </SidebarInset>
    </SidebarProvider>
  )
}
