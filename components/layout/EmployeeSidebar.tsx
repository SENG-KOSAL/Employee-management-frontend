"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock, CalendarClock, PanelLeft, PanelLeftClose, LogOut, User } from "lucide-react";

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
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import api from "@/services/api";
import { getMe, getToken, removeMe, removeToken } from "@/utils/auth";

type MePayload = {
  name?: string;
  role?: string | null;
  employee?: {
    full_name?: string | null;
    id?: number;
    role?: string | null;
  } | null;
};

const employeeNav = {
  main: [
    { title: "Employee Portal", icon: User, href: "/employee" },
    { title: "My Profile", icon: User, href: "/employee/profile" },
    { title: "My Attendance", icon: Clock, href: "/employee/attendance" },
    { title: "Request Leave", icon: CalendarClock, href: "/employee/leave" },
  ],
};

function CollapseToggle() {
  const { state, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-700"
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
    >
      {state === "expanded" ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
    </button>
  );
}

export function EmployeeSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState<string>("");

  const initials = useMemo(() => {
    const raw = displayName.trim();
    if (!raw) return "--";
    const parts = raw.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + second).toUpperCase() || "--";
  }, [displayName]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const cached = getMe<MePayload>();
    if (cached) {
      const role = (cached.employee?.role ?? cached.role ?? "").toLowerCase();
      if (role === "manager") {
        router.replace("/manager");
        return;
      }
      if (role && role !== "employee") {
        router.replace("/dashboard");
        return;
      }
      setDisplayName(cached.employee?.full_name || cached.name || "");
      return;
    }

    api
      .get("/api/v1/me")
      .then((res) => {
        const data: unknown = (res.data as { data?: unknown } | undefined)?.data ?? res.data;
        const next: MePayload = (data && typeof data === "object" ? (data as MePayload) : {}) as MePayload;
        const role = (next.employee?.role ?? next.role ?? "").toLowerCase();
        if (role === "manager") {
          router.replace("/manager");
          return;
        }
        if (role && role !== "employee") {
          router.replace("/dashboard");
          return;
        }
        setDisplayName(next.employee?.full_name || next.name || "");
      })
      .catch(() => {
        // ignore
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/logout");
    } catch {
      // ignore
    } finally {
      removeMe();
      removeToken();
      router.push("/auth/login");
    }
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        <SidebarHeader className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm">HR</div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-gray-900">Employee</span>
              <span className="text-xs text-gray-500">Portal</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {employeeNav.main.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === pathname;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200 p-3">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <span className="text-xs text-gray-400 group-data-[collapsible=icon]:hidden">Press ⌘B to toggle</span>
            <CollapseToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Employee Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">{initials}</div>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">{displayName || "Account"}</span>
              </div>

              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150">
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

        <main className="flex-1 overflow-auto bg-slate-50/70 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
