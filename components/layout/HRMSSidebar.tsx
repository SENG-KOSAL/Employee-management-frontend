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
  Megaphone,
  BarChart3,
  Shield,
  Settings,
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
import { getToken, removeToken } from "@/utils/auth"
import { useRouter } from "next/navigation"

type MePayload = {
  name?: string
  employee?: {
    full_name?: string | null
  } | null
}

// Navigation structure
const navigation = {
  main: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Employee Management",
      icon: Users,
      items: [
        { title: "Employees", href: "/employees" },
        { title: "Departments", href: "/departments" },
        { title: "Positions / Roles", href: "/positions" },
      ],
    },
    {
      title: "Attendance & Leave",
      icon: Clock,
      items: [
        { title: "Attendance", href: "/attendance" },
        { title: "Leave Requests", href: "/leave-requests" },
        { title: "Holidays", href: "/holidays" },
      ],
    },
    {
      title: "Payroll",
      icon: Wallet,
      items: [
        { title: "Salary", href: "/salary" },
        { title: "Payslips", href: "/payslips" },
      ],
    },
    {
      title: "Recruitment",
      icon: Megaphone,
      items: [
        { title: "Job Posts", href: "/job-posts" },
        { title: "Applicants", href: "/applicants" },
      ],
    },
    {
      title: "Performance",
      icon: BarChart3,
      items: [{ title: "Performance Reviews", href: "/performance-reviews" }],
    },
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

function SidebarNav() {
  const pathname = usePathname()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigation.main.map((item) => (
              <NavItem key={item.title} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>System</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigation.system.map((item) => (
              <NavItem key={item.title} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

function CollapseToggle() {
  const { state, toggleSidebar } = useSidebar()

  return (
    <button
      onClick={toggleSidebar}
      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
    >
      {state === "expanded" ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
    </button>
  )
}

export function HRMSSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>("")

  const initials = useMemo(() => {
    const raw = displayName.trim()
    if (!raw) return "--"
    const parts = raw.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ""
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
    return (first + second).toUpperCase() || "--"
  }, [displayName])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const loadMe = async () => {
      try {
        const res = await api.get("/api/v1/me")
        const data: any = res.data?.data ?? res.data
        const me: MePayload = data ?? {}
        const name = me.employee?.full_name || me.name || ""
        setDisplayName(name)
      } catch {
        // ignore; we'll just show initials placeholder
      }
    }

    loadMe()
  }, [])

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/logout")
    } catch {
      // ignore network/API errors; still clear local token
    } finally {
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
          <SidebarNav />
        </SidebarContent>

        {/* Footer with Collapse Toggle */}
        <SidebarFooter className="border-t border-gray-100 p-3">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <span className="text-xs text-gray-400 group-data-[collapsible=icon]:hidden">Press ⌘B to toggle</span>
            <CollapseToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  {initials}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  {displayName || "Account"}
                </span>
              </div>

              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName || "Account"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="size-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
