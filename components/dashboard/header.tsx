"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { user, notifications as notifApi, type AuthUser } from "@/lib/api"

export function DashboardHeader() {
  const [userData, setUserData] = useState<AuthUser | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) { try { setUserData(JSON.parse(stored)) } catch {} }

    user.getProfile()
      .then(d => { setUserData(d.user); localStorage.setItem("user", JSON.stringify(d.user)) })
      .catch(() => {})

    notifApi.unreadCount().then(d => setUnread(d.count ?? 0)).catch(() => {})
  }, [])

  const initials = userData ? `${userData.firstName?.[0] ?? ""}${userData.lastName?.[0] ?? ""}`.toUpperCase() : "U"

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Good {getGreeting()}, {userData?.firstName ?? "there"} 
        </h1>
        <p className="text-sm text-muted-foreground">Here's what's happening with your plants today</p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-accent transition-colors">
          <Bell className="h-4 w-4 text-foreground" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link href="/dashboard/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity overflow-hidden">
          {userData?.profileImageUrl
            ? <img src={userData.profileImageUrl} alt="Profile" className="h-9 w-9 object-cover" />
            : initials}
        </Link>
      </div>
    </header>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
