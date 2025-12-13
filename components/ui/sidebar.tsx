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
      <div className="flex h-screen">{children}</div>
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
      className={`flex flex-col border-r bg-white transition-all duration-300 ${
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
  return <div className={`border-b px-4 py-4 ${className}`} {...props} />
}

export function SidebarContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex-1 overflow-auto px-2 py-4 ${className}`} {...props} />
  )
}

export function SidebarFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-t px-3 py-3 ${className}`} {...props} />
  )
}

export function SidebarGroup({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`py-2 ${className}`} {...props} />
}

export function SidebarGroupLabel({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
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
  return <ul className={`space-y-1 ${className}`} {...props} />
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
      ? "bg-blue-100 text-blue-600 font-medium"
      : "text-gray-700 hover:bg-gray-100"
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
  return <ul className={`ml-3 space-y-1 border-l border-gray-200 pl-3 ${className}`} {...props} />
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
      ? "bg-blue-50 text-blue-600 font-medium"
      : "text-gray-600 hover:bg-gray-50"
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
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 ${className}`}
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
