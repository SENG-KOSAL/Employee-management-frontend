"use client"

import * as React from "react"


const sidebarContext = React.createContext<{
  state: "expanded" | "collapsed"
  toggleSidebar: () => void
} | null>(null)

export function useSidebar() {
  const context = React.useContext(sidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [state, setState] = React.useState<"expanded" | "collapsed">(
    defaultOpen ? "expanded" : "collapsed"
  )

  return (
    <sidebarContext.Provider
      value={{
        state,
        toggleSidebar: () =>
          setState((state) => (state === "expanded" ? "collapsed" : "expanded")),
      }}
    >
      <div className="flex h-screen bg-slate-50">{children}</div>
    </sidebarContext.Provider>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: "icon" | "none"
}

export function Sidebar({
  className = "",
  collapsible = "none",
  ...props
}: SidebarProps) {
  const { state } = useSidebar()
  const isCollapsed = collapsible === "icon" && state === "collapsed"

  return (
    <aside
      className={`flex flex-col border-r border-slate-200/90 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-out ${
        isCollapsed ? "w-20" : "w-64"
      } ${className}`}
      {...props}
    />
  )
}

export function SidebarHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b border-slate-200/90 px-4 py-4 ${className}`} {...props} />
}

export function SidebarContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex-1 overflow-auto px-2 py-3 ${className}`} {...props} />
  )
}

export function SidebarFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-t border-slate-200/90 px-3 py-3 ${className}`} {...props} />
  )
}

export function SidebarGroup({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`py-1.5 ${className}`} {...props} />
}

export function SidebarGroupLabel({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em] ${className}`}
      {...props}
    />
  )
}

export function SidebarGroupContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function SidebarMenu({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={`space-y-1.5 ${className}`} {...props} />
}

export function SidebarMenuItem({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />
}

interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string
}

export function SidebarMenuButton({
  className = "",
  asChild = false,
  isActive = false,
  tooltip,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const baseClass = `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-100"
      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
  } ${className}`

  if (asChild) {
    return React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            className: baseClass,
            title: isCollapsed && tooltip ? tooltip : "",
          } as any)
        : child
    )
  }

  return (
    <button
      className={baseClass}
      title={isCollapsed && tooltip ? tooltip : ""}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarMenuSub({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={`ml-3 space-y-1 border-l border-slate-200 pl-3 ${className}`} {...props} />
}

export function SidebarMenuSubItem({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />
}

interface SidebarMenuSubButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

export function SidebarMenuSubButton({
  className = "",
  asChild = false,
  isActive = false,
  children,
  ...props
}: SidebarMenuSubButtonProps) {
  const baseClass = `flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
    isActive
      ? "bg-blue-50 text-blue-700 font-medium"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  } ${className}`

  if (asChild) {
    return React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            className: baseClass,
          } as any)
        : child
    )
  }

  return (
    <button className={baseClass} {...props}>
      {children}
    </button>
  )
}

export function SidebarInset({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-1 flex-col overflow-hidden ${className}`} {...props} />
}

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarTrigger({
  className = "",
  ...props
}: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      onClick={toggleSidebar}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow ${className}`}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
