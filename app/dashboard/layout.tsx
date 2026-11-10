"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar, SIDEBAR_CLOSED_W, SIDEBAR_OPEN_W } from "@/components/dashboard/sidebar"
import { useApp } from "@/context/AppContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const offset = sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W

  const { isAuthenticated, isInitializing } = useApp()
  const router = useRouter()

  // Protect every dashboard page in one place —
  // if user is not logged in, redirect to login
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isInitializing, router])

  // Don't render anything while checking auth or if not authenticated
  if (isInitializing || !isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main
        style={{ marginLeft: offset, transition: "margin-left 300ms ease-in-out" }}
        className="min-h-screen "
      >
        {children}
      </main>
    </div>
  )
}