"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Leaf, LayoutDashboard, Sprout, Calendar,
  History, MessageCircle, Crown, LogOut, ChevronRight,
  BarChart2, Bell, ScanLine, User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { notifications as notifApi, user } from "@/lib/api"
import { useApp } from "@/context/AppContext"

const navItems = [
  { href: "/dashboard",                icon: LayoutDashboard, label: "Dashboard"            },
  { href: "/dashboard/my-plants",      icon: Sprout,          label: "My Plants"            },
  { href: "/dashboard/scan",           icon: ScanLine,        label: "Scan"                 },
  { href: "/dashboard/scanHistory",    icon: History,         label: "Disease Scan History" },
  { href: "/dashboard/spread-scan",    icon: ScanLine,        label: "Spread Scan"          },
  { href: "/dashboard/spread-history", icon: Sprout,          label: "Spread Scan History"  },
  { href: "/dashboard/chat",           icon: MessageCircle,   label: "AI Assistant"         },
  { href: "/dashboard/schedule",       icon: Calendar,        label: "Schedule"             },
  { href: "/dashboard/analytics",      icon: BarChart2,       label: "Analytics"            },
  { href: "/dashboard/notifications",  icon: Bell,            label: "Notifications"        },
  { href: "/dashboard/upgrade",        icon: Crown,           label: "Upgrade"              },
  { href: "/dashboard/profile",        icon: User,            label: "Profile"              },
]

export const SIDEBAR_CLOSED_W = 52
export const SIDEBAR_OPEN_W   = 220

export function DashboardSidebar() {
  const pathname   = usePathname()
  const { logout } = useApp()

  const [open, setOpen]               = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [subscription, setSubscription] = useState<{
    plan: string; scansUsed?: number; scanLimit?: number
  } | null>(null)

  useEffect(() => {
    notifApi.unreadCount().then(d => setUnreadCount(d.count ?? 0)).catch(() => {})
    user.getSubscription().then(d => setSubscription(d)).catch(() => {})
  }, [])

  const scansUsed    = subscription?.scansUsed ?? 0
  const scanLimit    = subscription?.scanLimit ?? (subscription?.plan === "PRO" ? 30 : 5)
  const scanProgress = Math.min(Math.round((scansUsed / scanLimit) * 100), 100)

  return (
    <aside
      style={{
        width: open ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W,
        backgroundColor: "var(--sidebar-bg)",
        borderRightColor: "var(--sidebar-border)",
      }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300 ease-in-out"
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 py-5 transition-all duration-300",
        open ? "px-4" : "justify-center px-0"
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(74,222,128,0.15)", outline: "1px solid rgba(74,222,128,0.25)" }}>
          <Leaf className="h-4 w-4" style={{ color: "var(--sidebar-icon-active)" }} />
        </div>
        {open && <span className="text-[15px] font-semibold tracking-tight text-white/90">PlantGuard</span>}
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          const isNotif  = href === "/dashboard/notifications"
          return (
            <Link 
              key={href} 
              href={href} 
              title={!open ? label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition-all duration-150",
                open ? "px-3" : "justify-center px-0",
              )}
              style={{
                backgroundColor: isActive ? "var(--sidebar-active-bg)" : "transparent",
                color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
              }}
              onMouseEnter={e => { 
                if (!isActive) { 
                  const el = e.currentTarget as HTMLElement; 
                  el.style.backgroundColor = "rgba(255,255,255,0.06)"; 
                  el.style.color = "var(--sidebar-text-hover)" 
                }
              }}
              onMouseLeave={e => { 
                if (!isActive) { 
                  const el = e.currentTarget as HTMLElement; 
                  el.style.backgroundColor = "transparent"; 
                  el.style.color = "var(--sidebar-text)" 
                }
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: "var(--sidebar-active-indicator)" }} />
              )}
              <div className="relative">
                <Icon className="h-[18px] w-[18px] shrink-0"
                  style={{ color: isActive ? "var(--sidebar-icon-active)" : "var(--sidebar-icon)" }} />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {open && <span>{label}</span>}
              {open && isNotif && unreadCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <button
          onClick={logout} 
          title={!open ? "Log Out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition-all",
            open ? "px-3" : "justify-center px-0"
          )}
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={e => { 
            const el = e.currentTarget as HTMLElement; 
            el.style.backgroundColor = "rgba(255,255,255,0.05)"; 
            el.style.color = "#f87171" 
          }}
          onMouseLeave={e => { 
            const el = e.currentTarget as HTMLElement; 
            el.style.backgroundColor = "transparent"; 
            el.style.color = "var(--sidebar-text)" 
          }}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {open && <span>Log Out</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)} 
        aria-label={open ? "Collapse" : "Expand"}
        className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-white/10 shadow-md"
        style={{ backgroundColor: "var(--sidebar-toggle-bg)", color: "var(--sidebar-text)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff" }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)" }}
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform duration-300", open && "rotate-180")} />
      </button>
    </aside>
  )
}