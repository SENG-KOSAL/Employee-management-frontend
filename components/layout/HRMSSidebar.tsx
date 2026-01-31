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

type MePayload = {
  name?: string
  employee?: {
    full_name?: string | null
    id?: number
    role?: string | null
  } | null
  role?: string | null
}

const managerNavigation = {
  main: [
    {
      title: "Manager Portal",
      icon: ShieldCheck,
      href: "/manager",
    },
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
    {
      title: "Manager Portal",
      icon: ShieldCheck,
      href: "/manager",
    },
    {
      title: "Employee Management",
      icon: Users,
      items: [
        { title: "Dashboard", href: "/employees/dashboard" },
        { title: "Employees", href: "/employees" },
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
      ],
    },
    {
      title: "Payroll",
      icon: Wallet,
      items: [
        { title: "Dashboard", href: "/payroll/dashboard" },
        { title: "Salary", href: "/salaries" },
        { title: "Payslips", href: "/payslips" },
        { title: "Payroll", href: "/payroll" },
      ],
    },
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href || "#"}>
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
              <NavItem key={item.title} item={item} pathname={pathname} />
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
                <NavItem key={item.title} item={item} pathname={pathname} />
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
  const [displayName, setDisplayName] = useState<string>("")
  const [me, setMe] = useState<MePayload | null>(null)
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
  const isManager = (userRole || "").toLowerCase() === "manager"
  const isAdmin = (userRole || "").toLowerCase() === "admin"

  const navToUse = useMemo(() => {
    if (isManager) return managerNavigation
    if (isAdmin) return navigation
    return {
      ...navigation,
      system: navigation.system.filter((item) => item.href !== "/users-permissions"),
    }
  }, [isAdmin, isManager])

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
      <Sidebar collapsible="icon" className="border-r border-gray-200 bg-white">
        {/* Header with Logo */}
        <SidebarHeader className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              HR
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-gray-900">HRMS Pro</span>
              <span className="text-xs text-gray-500">Management System</span>
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
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Overview of your organization</p>
          </div>
          
          <div className="flex items-center gap-2">
              <div className="text-sm text-right hidden sm:block">
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
