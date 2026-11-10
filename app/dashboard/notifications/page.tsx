"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, CheckCheck, Leaf, AlertTriangle, Calendar, Activity, Info, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { notifications as notifApi, type Notification } from "@/lib/api"
import { useApp } from "@/context/AppContext"
import { cn } from "@/lib/utils"

const typeIcons: Record<string, React.ReactNode> = {
  TASK_REMINDER: <Calendar className="h-5 w-5 text-blue-500" />,
  OVERDUE_WATERING: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  OVERDUE_FERTILIZING: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  HEALTH_DECLINE: <Activity className="h-5 w-5 text-red-500" />,
  DISEASE_DETECTED: <AlertTriangle className="h-5 w-5 text-red-500" />,
  WEEKLY_REPORT: <Leaf className="h-5 w-5 text-emerald-500" />,
  SYSTEM: <Info className="h-5 w-5 text-sky-500" />,
}

const getRelativeTime = (date: string) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function NotificationsPage() {
  const { isAuthenticated } = useApp()
  const [notifList, setNotifList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const load = useCallback(async (unreadOnly: boolean) => {
    setLoading(true)
    try {
      const d = await notifApi.list(unreadOnly)
      setNotifList(d.notifications ?? [])
    } catch (err) {
      console.error("Failed to load notifications", err)
      setNotifList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) load(filter === "unread")
  }, [isAuthenticated, load, filter])

  const handleMarkRead = async (id: string) => {
    try {
      await notifApi.markRead(id)
      setNotifList(prev =>
        prev.map(n =>
          n.notification_id === id ? { ...n, status: "READ" as const } : n
        )
      )
    } catch (err) {
      console.error("Failed to mark notification read", err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead()
      setNotifList(prev => prev.map(n => ({ ...n, status: "READ" as const })))
    } catch (err) {
      console.error("Failed to mark all notifications read", err)
    }
  }

  const handleFilterChange = (f: "all" | "unread") => {
    setFilter(f)
  }

  const unreadCount = notifList.filter(n => n.status !== "READ").length

  // Group notifications by date
  const groupedNotifications = notifList.reduce((groups: any, notif) => {
    const date = new Date(notif.createdAt).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(notif)
    return groups
  }, {})

  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on your garden's care and health
          </p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
              filter === f
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All Notifications" : "Unread Only"}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-2 text-xs bg-destructive text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Bell className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground">No notifications yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            {filter === "unread"
              ? "You're all caught up! No unread notifications."
              : "Your care reminders, health alerts, and updates will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((dateKey) => {
            const date = new Date(dateKey)
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>

                <div className="space-y-3">
                  {groupedNotifications[dateKey].map((n: Notification) => {
                    const isUnread = n.status !== "READ"
                    return (
                      <div
                        key={n.notification_id}
                        className={cn(
                          "group flex gap-4 rounded-2xl border p-5 transition-all hover:shadow-md",
                          isUnread
                            ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                            : "border-border hover:border-border/80 bg-card"
                        )}
                      >
                        <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                          isUnread ? "bg-primary/10" : "bg-muted"
                        }`}>
                          {typeIcons[n.type] || <Bell className="h-6 w-6 text-muted-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`font-semibold leading-tight ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </p>
                            {isUnread && (
                              <button
                                onClick={() => handleMarkRead(n.notification_id)}
                                className="text-xs text-primary hover:underline whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Mark read
                              </button>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {n.body}
                          </p>

                          <p className="mt-3 text-xs text-muted-foreground/70 flex items-center gap-1.5">
                            {getRelativeTime(n.createdAt)}
                          </p>
                        </div>

                        {isUnread && (
                          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-primary/20 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}